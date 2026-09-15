-- Account-level plans. Public catalog, private usage, transactional manual billing.
create table public.plan_catalog (
  slug text primary key check (slug in ('free','plus','pro')),
  name text not null check (length(name) between 1 and 40),
  description text not null default '' check (length(description) <= 500),
  price_minor integer check (price_minor between 0 and 100000000),
  currency text not null default 'PHP' check (currency in ('PHP','USD')),
  availability text not null default 'coming_soon' check (availability in ('available','coming_soon')),
  workspace_limit integer not null check (workspace_limit between 1 and 1000),
  storage_limit_bytes bigint not null check (storage_limit_bytes between 1048576 and 107374182400),
  updated_at timestamptz not null default now(),
  check (slug <> 'free' or (price_minor = 0 and availability = 'available')),
  check (slug = 'free' or availability <> 'available' or price_minor > 0 and price_minor is not null)
);
insert into public.plan_catalog values
('free','Free','One focused search with the essentials.',0,'PHP','available',1,10485760,now()),
('plus','Plus','Room for several search directions.',null,'PHP','coming_soon',5,104857600,now()),
('pro','Pro','More capacity for an extensive search.',null,'PHP','coming_soon',20,524288000,now());
create table public.account_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_slug text not null references public.plan_catalog(slug),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (plan_slug = 'free' or expires_at is not null)
);
create table public.account_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content_bytes bigint not null default 0 check (content_bytes >= 0),
  active_workspaces integer not null default 0 check (active_workspaces >= 0)
);
create table public.billing_settings (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  bank_name text not null default '' check(length(bank_name)<=120),
  account_name text not null default '' check(length(account_name)<=160),
  account_number text not null default '' check(length(account_number)<=100),
  instructions text not null default '' check(length(instructions)<=5000),
  qr_image text not null default '' check(length(qr_image)<=1400000 and (qr_image='' or qr_image ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')),
  support_email text not null default '' check(length(support_email)<=254),
  updated_at timestamptz not null default now(),
  check(not enabled or (length(account_name)>0 and (length(account_number)>0 or length(qr_image)>0) and length(instructions)>0 and length(support_email)>0))
);
insert into public.billing_settings(id) values(true);
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_slug text not null references public.plan_catalog(slug) check(plan_slug<>'free'),
  amount_minor integer not null check(amount_minor>0),
  currency text not null,
  instructions_snapshot jsonb not null,
  status text not null default 'awaiting_payment' check(status in ('awaiting_payment','pending','approved','rejected','cancelled')),
  transfer_reference text not null default '' check(length(transfer_reference)<=160),
  review_note text not null default '' check(length(review_note)<=1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create unique index payment_requests_one_open on public.payment_requests(user_id) where status in ('awaiting_payment','pending');
create index payment_requests_review_queue on public.payment_requests(status,created_at desc);
create table public.help_articles (
  slug text primary key check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
  title text not null check(length(title) between 1 and 160),
  summary text not null default '' check(length(summary)<=400),
  body text not null check(length(body) between 1 and 20000),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.plan_catalog enable row level security;
alter table public.account_plans enable row level security;
alter table public.account_usage enable row level security;
alter table public.billing_settings enable row level security;
alter table public.payment_requests enable row level security;
alter table public.help_articles enable row level security;
create policy catalog_read on public.plan_catalog for select to anon,authenticated using(true);
create policy plan_read on public.account_plans for select to authenticated using(user_id=auth.uid() or public.is_roleway_admin());
create policy usage_read on public.account_usage for select to authenticated using(user_id=auth.uid() or public.is_roleway_admin());
create policy billing_read on public.billing_settings for select to authenticated using(true);
create policy payment_read on public.payment_requests for select to authenticated using(user_id=auth.uid() or public.can_manage_roleway_users());
create policy article_read on public.help_articles for select to anon,authenticated using(published or public.is_roleway_admin());
grant select on public.plan_catalog,public.help_articles to anon,authenticated;
grant select on public.account_plans,public.account_usage,public.billing_settings,public.payment_requests to authenticated;

create function public.effective_plan(input_user_id uuid) returns public.plan_catalog
language sql stable security definer set search_path='' as $$
 select p from public.plan_catalog p where p.slug=coalesce((select plan_slug from public.account_plans where user_id=input_user_id and (plan_slug='free' or expires_at>now())),'free');
$$;
revoke all on function public.effective_plan(uuid) from public;

-- Meter product JSON bytes; not physical database/index/WAL allocation or file storage.
insert into public.account_usage(user_id,active_workspaces)
select u.id,(select count(*) from public.search_projects p where p.user_id=u.id and p.status<>'archived') from auth.users u;
do $$ declare relation text; begin
 foreach relation in array array['jobs','opportunities','tasks','opportunity_notes','documents','document_versions','contacts','interviews','application_records','agent_conversations','agent_messages','ai_runs','agent_run_steps','agent_proposals'] loop
   execute format('update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.%I t group by user_id) s where u.user_id=s.user_id',relation);
 end loop;
end $$;
create function public.enforce_account_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; usage public.account_usage; plan public.plan_catalog; byte_delta bigint:=0; slot_delta integer:=0;
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
 else
   if tg_op<>'DELETE' then byte_delta:=byte_delta+octet_length(to_jsonb(new)::text); end if;
   if tg_op<>'INSERT' then byte_delta:=byte_delta-octet_length(to_jsonb(old)::text); end if;
 end if;
 if slot_delta>0 and usage.active_workspaces+slot_delta>plan.workspace_limit then
   raise exception using errcode='P0001',message='PLAN_WORKSPACE_LIMIT';
 end if;
 if byte_delta>0 and usage.content_bytes+byte_delta>plan.storage_limit_bytes then
   raise exception using errcode='P0001',message='PLAN_STORAGE_LIMIT';
 end if;
 update public.account_usage set content_bytes=greatest(0,content_bytes+byte_delta),active_workspaces=greatest(0,active_workspaces+slot_delta) where user_id=owner_id;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.enforce_account_capacity() from public;
do $$ declare relation text; begin
 foreach relation in array array['search_projects','jobs','opportunities','tasks','opportunity_notes','documents','document_versions','contacts','interviews','application_records','agent_conversations','agent_messages','ai_runs','agent_run_steps','agent_proposals'] loop
  execute format('create trigger zz_account_capacity before insert or update or delete on public.%I for each row execute function public.enforce_account_capacity()',relation);
 end loop;
end $$;

create function public.account_plan_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select jsonb_build_object('plan',to_jsonb(public.effective_plan(auth.uid())),'usage',coalesce((select to_jsonb(u) from public.account_usage u where user_id=auth.uid()),'{"content_bytes":0,"active_workspaces":0}'::jsonb),'expires_at',(select expires_at from public.account_plans where user_id=auth.uid())) into result;
 return result;
end $$;
revoke all on function public.account_plan_summary() from public;
grant execute on function public.account_plan_summary() to authenticated;

create function public.admin_save_plan(input_slug text,input_name text,input_description text,input_price_minor integer,input_currency text,input_availability text,input_workspace_limit integer,input_storage_limit_bytes bigint) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 update public.plan_catalog set name=input_name,description=input_description,price_minor=input_price_minor,currency=input_currency,availability=input_availability,workspace_limit=input_workspace_limit,storage_limit_bytes=input_storage_limit_bytes,updated_at=now() where slug=input_slug;
 if not found then raise exception 'Plan not found'; end if;
 insert into public.admin_audit_logs(actor_user_id,action,metadata) values(auth.uid(),'plan_updated',jsonb_build_object('plan',input_slug,'workspace_limit',input_workspace_limit,'storage_limit_bytes',input_storage_limit_bytes));
end $$;
revoke all on function public.admin_save_plan(text,text,text,integer,text,text,integer,bigint) from public;
grant execute on function public.admin_save_plan(text,text,text,integer,text,text,integer,bigint) to authenticated;

create function public.admin_save_billing(input_enabled boolean,input_bank_name text,input_account_name text,input_account_number text,input_instructions text,input_qr_image text,input_support_email text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 update public.billing_settings set enabled=input_enabled,bank_name=input_bank_name,account_name=input_account_name,account_number=input_account_number,instructions=input_instructions,qr_image=input_qr_image,support_email=input_support_email,updated_at=now() where id;
 insert into public.admin_audit_logs(actor_user_id,action,metadata) values(auth.uid(),'billing_settings_updated',jsonb_build_object('enabled',input_enabled));
end $$;
revoke all on function public.admin_save_billing(boolean,text,text,text,text,text,text) from public;
grant execute on function public.admin_save_billing(boolean,text,text,text,text,text,text) to authenticated;

create function public.request_plan_payment(input_plan text) returns uuid
language plpgsql security definer set search_path='' as $$
declare plan public.plan_catalog; settings public.billing_settings; request_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into plan from public.plan_catalog where slug=input_plan for share;
 select * into settings from public.billing_settings where id for share;
 if plan.slug is null or plan.slug='free' or plan.availability<>'available' or not settings.enabled then raise exception 'This plan is not accepting payments'; end if;
 insert into public.payment_requests(user_id,plan_slug,amount_minor,currency,instructions_snapshot)
 values(auth.uid(),plan.slug,plan.price_minor,plan.currency,to_jsonb(settings)-'id'-'updated_at') returning id into request_id;
 return request_id;
end $$;
revoke all on function public.request_plan_payment(text) from public;
grant execute on function public.request_plan_payment(text) to authenticated;

create function public.submit_plan_payment(input_id uuid,input_reference text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(input_reference)) not between 3 and 160 then raise exception 'Enter a transfer reference'; end if;
 update public.payment_requests set transfer_reference=trim(input_reference),status='pending' where id=input_id and user_id=auth.uid() and status='awaiting_payment';
 if not found then raise exception 'Request is no longer awaiting payment'; end if;
end $$;
revoke all on function public.submit_plan_payment(uuid,text) from public;
grant execute on function public.submit_plan_payment(uuid,text) to authenticated;
create function public.cancel_plan_payment(input_id uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 update public.payment_requests set status='cancelled' where id=input_id and user_id=auth.uid() and status='awaiting_payment';
 if not found then raise exception 'Only an unpaid request can be cancelled'; end if;
end $$;
revoke all on function public.cancel_plan_payment(uuid) from public;
grant execute on function public.cancel_plan_payment(uuid) to authenticated;

create function public.admin_assign_plan(input_user_id uuid,input_plan text,input_expires_at timestamptz,input_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 if length(trim(input_reason)) not between 3 and 1000 then raise exception 'Record a reason'; end if;
 if input_plan<>'free' and (input_expires_at is null or input_expires_at<=now()) then raise exception 'Choose a future expiry'; end if;
 perform 1 from public.account_usage where user_id=input_user_id for update;
 insert into public.account_plans(user_id,plan_slug,expires_at) values(input_user_id,input_plan,case when input_plan='free' then null else input_expires_at end)
 on conflict(user_id) do update set plan_slug=excluded.plan_slug,expires_at=excluded.expires_at,updated_at=now();
 insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata) values(auth.uid(),'plan_assigned',input_user_id,jsonb_build_object('plan',input_plan,'expires_at',input_expires_at,'reason',input_reason));
end $$;
revoke all on function public.admin_assign_plan(uuid,text,timestamptz,text) from public;
grant execute on function public.admin_assign_plan(uuid,text,timestamptz,text) to authenticated;

create function public.admin_review_payment(input_id uuid,input_approve boolean,input_note text) returns void
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
   until_at:=case when assignment.plan_slug=request.plan_slug then greatest(now(),coalesce(assignment.expires_at,now())) else now() end + interval '30 days';
   perform public.admin_assign_plan(request.user_id,request.plan_slug,until_at,'Verified manual payment '||request.id::text);
 end if;
 update public.payment_requests set status=case when input_approve then 'approved' else 'rejected' end,review_note=trim(input_note),reviewed_at=now(),reviewed_by=auth.uid() where id=input_id;
 insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata) values(auth.uid(),'payment_reviewed',request.user_id,jsonb_build_object('request_id',input_id,'approved',input_approve));
end $$;
revoke all on function public.admin_review_payment(uuid,boolean,text) from public;
grant execute on function public.admin_review_payment(uuid,boolean,text) to authenticated;

create function public.admin_save_article(input_slug text,input_title text,input_summary text,input_body text,input_published boolean) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 insert into public.help_articles(slug,title,summary,body,published) values(input_slug,input_title,input_summary,input_body,input_published)
 on conflict(slug) do update set title=excluded.title,summary=excluded.summary,body=excluded.body,published=excluded.published,updated_at=now();
 insert into public.admin_audit_logs(actor_user_id,action,metadata) values(auth.uid(),'help_article_updated',jsonb_build_object('slug',input_slug,'published',input_published));
end $$;
revoke all on function public.admin_save_article(text,text,text,text,boolean) from public;
grant execute on function public.admin_save_article(text,text,text,text,boolean) to authenticated;

-- Deliberately bounded, read-only content inspection. Never expose credentials or raw auth records.
create function public.admin_user_detail(input_user_id uuid,input_kind text default 'workspaces',input_record_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare relation text; rows jsonb; selected jsonb; result jsonb; begin
 if not public.can_manage_roleway_users() then raise exception 'Not authorized'; end if;
 relation:=case input_kind when 'workspaces' then 'search_projects' when 'jobs' then 'jobs' when 'opportunities' then 'opportunities' when 'documents' then 'documents' when 'contacts' then 'contacts' when 'interviews' then 'interviews' else null end;
 if relation is null then raise exception 'Unsupported content type'; end if;
 execute format('select coalesce(jsonb_agg(r),''[]''::jsonb) from (select id,coalesce(to_jsonb(t)->>''title'',to_jsonb(t)->>''name'',to_jsonb(t)->>''next_action'',''Record'') label from public.%I t where user_id=$1 order by coalesce(to_jsonb(t)->>''created_at'',to_jsonb(t)->>''imported_at'') desc limit 100) r',relation) into rows using input_user_id;
 if input_record_id is not null then
   execute format('select to_jsonb(t) from public.%I t where user_id=$1 and id=$2',relation) into selected using input_user_id,input_record_id;
 end if;
 select jsonb_build_object('user',jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'name',p.full_name),'plan',to_jsonb(public.effective_plan(u.id)),'assignment',(select to_jsonb(a) from public.account_plans a where user_id=u.id),'usage',(select to_jsonb(a) from public.account_usage a where user_id=u.id),'records',rows,'record',selected) into result from auth.users u left join public.profiles p on p.user_id=u.id where u.id=input_user_id;
 if result is null then raise exception 'Account not found'; end if;
 insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata) values(auth.uid(),'user_content_viewed',input_user_id,jsonb_build_object('kind',input_kind,'record_id',input_record_id));
 return result;
end $$;
revoke all on function public.admin_user_detail(uuid,text,uuid) from public;
grant execute on function public.admin_user_detail(uuid,text,uuid) to authenticated;

insert into public.help_articles(slug,title,summary,body,published) values
('getting-started','Start your first focused search','Set up a Workspace, save a Job, and choose your next action.',E'Create one Workspace for each career direction. Give it a clear name and objective in Settings → Workspaces.\n\nSave a Job with Add job. Paste its listing URL for supported capture, or enter details manually. Check imported details before saving.\n\nReview the Job in Inbox. Track it when it deserves effort; tracking creates an Opportunity. Choose one next action so you know what to do next.\n\nOpen Home to review due work and follow-ups. You stay in control of every application and external message.',true),
('workspaces-and-limits','Understand Workspaces and plan limits','Manage active searches and saved content without losing history.',E'A Workspace is one focused job search. Free starts with one active Workspace; current limits appear in Plan & billing.\n\nArchive an inactive Workspace in its settings to release an active slot. Archived records remain saved and count toward storage. Restore it when a slot is available.\n\nSaved content includes Jobs, Opportunities, documents, versions, contacts, interviews, and Agent history. It measures stored JSON content, not uploaded files or physical database size.\n\nWhen a plan expires or a limit is lowered, your records stay available. Additional growth is blocked until you free space or change plans. Export your records from Privacy & data before deleting anything.',true),
('manual-payments','Pay for a plan manually','Create a request, transfer payment, and track its review.',E'Paid plans may be marked Coming soon. You cannot purchase them until an administrator enables the plan and configures payments.\n\nIn Plan & billing, choose an available plan to create a payment request. Check the exact amount, currency, beneficiary, and bank or QR instructions saved with that request. Include your request ID when sending payment.\n\nAfter paying, enter your bank or wallet transfer reference and submit for review. A reference alone does not activate a plan: an administrator verifies actual receipt.\n\nApproved payments grant 30 days. Renewing the same plan extends its unexpired term; switching plans starts a new term without automatic proration. There is no recurring debit. Review request history for approval or rejection notes. Contact support before sending another payment if something is unclear.',true),
('documents-and-history','Keep documents and versions organized','Write, revise, and connect application material to Opportunities.',E'Open Documents to create a resume, cover letter, answer, message, or research note. Link it to an Opportunity when it belongs to a specific application.\n\nSaving changed content creates an immutable version. Versions count toward saved content. Mark documents approved only after reviewing their accuracy.\n\nDeleting a document removes its version history and releases that storage. Export any information you need before deletion. Roleway currently edits text documents; it does not upload PDF or Word attachments.',true),
('agent-and-privacy','Use the Agent with control','Connect your provider and review every proposed change.',E'Configure your own supported AI provider in Settings → Agent. Provider charges are separate from your Roleway plan. Core tracking works without AI.\n\nThe Agent can use your permitted Workspace context to answer questions and prepare drafts. Review the destination Workspace and exact changes before approving a proposal.\n\nThe Agent does not submit job applications or contact employers. You execute external actions. Never place passwords, payment credentials, or unrelated private data into a prompt.',true);
create function public.support_contact() returns text
language sql stable security definer set search_path='' as $$ select support_email from public.billing_settings where id; $$;
revoke all on function public.support_contact() from public;
grant execute on function public.support_contact() to anon,authenticated;
