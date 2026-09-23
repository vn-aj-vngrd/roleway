-- Private, explicitly assigned Unlimited capacity; public paid offers remain monthly.
alter table public.plan_catalog drop constraint plan_catalog_slug_check;
alter table public.plan_catalog add constraint plan_catalog_slug_check check(slug in ('free','plus','pro','unlimited'));
alter table public.plan_catalog drop constraint plan_catalog_check1;
alter table public.plan_catalog add constraint plan_catalog_check1 check(slug in ('free','unlimited') or availability<>'available' or (price_minor>0 and price_minor is not null));
alter table public.account_plans drop constraint account_plans_check;
alter table public.account_plans add constraint account_plans_check check(plan_slug in ('free','unlimited') or expires_at is not null);
-- Numeric catalog fields are ignored by enforcement for Unlimited, never used as a fake cap.
insert into public.plan_catalog(slug,name,description,price_minor,currency,availability,workspace_limit,storage_limit_bytes)
values('unlimited','Unlimited','Private administrative assignment. No Workspace or saved-content cap.',0,'PHP','available',1000,107374182400);
drop policy catalog_read on public.plan_catalog;
create policy catalog_read on public.plan_catalog for select to anon,authenticated using(slug<>'unlimited');
create policy catalog_private_read on public.plan_catalog for select to authenticated using(public.can_manage_roleway_users());
create or replace function public.effective_plan(input_user_id uuid) returns public.plan_catalog
language sql stable security definer set search_path='' as $$
 select p from public.plan_catalog p where p.slug=coalesce((select plan_slug from public.account_plans where user_id=input_user_id and (plan_slug in ('free','unlimited') or expires_at>now())),'free');
$$;
create function public.initialize_free_account_plan() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.account_plans(user_id,plan_slug) values(new.id,'free') on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function public.initialize_free_account_plan() from public;
create trigger zz_initialize_free_plan after insert on auth.users for each row execute function public.initialize_free_account_plan();
insert into public.account_plans(user_id,plan_slug) select id,'free' from auth.users on conflict(user_id) do nothing;
-- Reconcile both usage dimensions while writes to the source table are locked.
lock table public.search_projects in share row exclusive mode;
update public.account_usage u set active_workspaces=(select count(*) from public.search_projects p where p.user_id=u.user_id and p.status<>'archived');
create or replace function public.enforce_account_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; usage public.account_usage; plan public.plan_catalog; byte_delta bigint:=0; slot_delta integer:=0; archive_only boolean:=false;
begin
 owner_id:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Record ownership cannot change'; end if;
 -- Parent deletion may already have removed usage. Never recreate it during cascades.
 if not exists(select 1 from auth.users where id=owner_id) then return old; end if;
 insert into public.account_usage(user_id) values(owner_id) on conflict do nothing;
 select * into usage from public.account_usage where user_id=owner_id for update;
 select * into plan from public.effective_plan(owner_id);
 if tg_table_name='search_projects' then
   if tg_op<>'DELETE' and new.status<>'archived' then slot_delta:=slot_delta+1; end if;
   if tg_op<>'INSERT' and old.status<>'archived' then slot_delta:=slot_delta-1; end if;
   if slot_delta<0 then
     archive_only := (to_jsonb(new)-'status'-'updated_at'-'is_favorite') = (to_jsonb(old)-'status'-'updated_at'-'is_favorite') and (new.is_favorite=old.is_favorite or new.is_favorite=false);
   end if;
 end if;
   if tg_op<>'DELETE' then byte_delta:=byte_delta+octet_length(to_jsonb(new)::text); end if;
   if tg_op<>'INSERT' then byte_delta:=byte_delta-octet_length(to_jsonb(old)::text); end if;
 if plan.slug<>'unlimited' and slot_delta>0 and usage.active_workspaces+slot_delta>plan.workspace_limit then
   raise exception using errcode='P0001',message='PLAN_WORKSPACE_LIMIT';
 end if;
 if plan.slug<>'unlimited' and byte_delta>0 and not archive_only and usage.content_bytes+byte_delta>plan.storage_limit_bytes then
   raise exception using errcode='P0001',message='PLAN_STORAGE_LIMIT';
 end if;
 update public.account_usage set content_bytes=greatest(0,content_bytes+byte_delta),active_workspaces=greatest(0,active_workspaces+slot_delta) where user_id=owner_id;
 if tg_op='DELETE' then return old; end if; return new;
end $$;

create or replace function public.admin_assign_plan(input_user_id uuid,input_plan text,input_expires_at timestamptz,input_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 if length(trim(input_reason)) not between 3 and 1000 then raise exception 'Record a reason'; end if;
 if input_plan in ('plus','pro') and input_expires_at is null then input_expires_at:=now()+interval '1 month'; end if;
 if input_plan not in ('free','unlimited') and (input_expires_at is null or input_expires_at<=now()) then raise exception 'Choose a future expiry'; end if;
 perform 1 from public.account_usage where user_id=input_user_id for update;
 insert into public.account_plans(user_id,plan_slug,expires_at) values(input_user_id,input_plan,case when input_plan in ('free','unlimited') then null else input_expires_at end)
 on conflict(user_id) do update set plan_slug=excluded.plan_slug,expires_at=excluded.expires_at,updated_at=now();
 insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata) values(auth.uid(),'plan_assigned',input_user_id,jsonb_build_object('plan',input_plan,'expires_at',input_expires_at,'reason',input_reason));
end $$;
revoke all on function public.admin_assign_plan(uuid,text,timestamptz,text) from public;
grant execute on function public.admin_assign_plan(uuid,text,timestamptz,text) to authenticated;


create or replace function public.admin_review_payment(input_id uuid,input_approve boolean,input_note text) returns void
language plpgsql security definer set search_path='' as $$
declare request public.payment_requests; assignment public.account_plans; until_at timestamptz; begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 if length(trim(input_note)) not between 3 and 1000 then raise exception 'Record verification details or a rejection reason'; end if;
 select * into request from public.payment_requests where id=input_id for update;
 if request.id is null or request.status<>'pending' then raise exception 'Request is not pending review'; end if;
 if input_approve then
   -- Account row serializes plan grants without locking global catalog state.
   perform 1 from public.account_usage where user_id=request.user_id for update;
   select * into assignment from public.account_plans where user_id=request.user_id for update;
   until_at:=case when assignment.plan_slug=request.plan_slug then greatest(now(),coalesce(assignment.expires_at,now())) else now() end + interval '1 month';
   perform public.admin_assign_plan(request.user_id,request.plan_slug,until_at,'Verified manual payment '||request.id::text);
 end if;
 update public.payment_requests set status=case when input_approve then 'approved' else 'rejected' end,review_note=trim(input_note),reviewed_at=now(),reviewed_by=auth.uid() where id=input_id;
 insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata) values(auth.uid(),'payment_reviewed',request.user_id,jsonb_build_object('request_id',input_id,'approved',input_approve));
end $$;
revoke all on function public.admin_review_payment(uuid,boolean,text) from public;
grant execute on function public.admin_review_payment(uuid,boolean,text) to authenticated;


create or replace function public.request_plan_payment(input_plan text) returns uuid
language plpgsql security definer set search_path='' as $$
declare plan public.plan_catalog; settings public.billing_settings; request_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.account_usage where user_id=auth.uid() for update;
 if (select count(*) from public.payment_requests where user_id=auth.uid() and created_at>now()-interval '24 hours')>=3 then raise exception 'PAYMENT_REQUEST_LIMIT'; end if;
 select * into plan from public.plan_catalog where slug=input_plan for share;
 select * into settings from public.billing_settings where id for share;
 if plan.slug is null or plan.slug not in ('plus','pro') or plan.availability<>'available' or not settings.enabled then raise exception 'This plan is not accepting payments'; end if;
 insert into public.payment_requests(user_id,plan_slug,amount_minor,currency,instructions_snapshot)
 values(auth.uid(),plan.slug,plan.price_minor,plan.currency,to_jsonb(settings)-'id'-'updated_at') returning id into request_id;
 return request_id;
end $$;


update public.help_articles set body=replace(body,'30 days','one calendar month') where slug='manual-payments';
