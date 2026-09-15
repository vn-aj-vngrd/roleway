-- Close remaining direct-write storage gaps and bound manual request history.
lock table public.profiles,public.career_preferences,public.search_projects,public.opportunity_events,public.notifications,public.agent_preferences,public.notification_preferences,public.jobs,public.opportunities,public.tasks,public.opportunity_notes,public.documents,public.document_versions,public.contacts,public.interviews,public.application_records,public.agent_conversations,public.agent_messages,public.ai_runs,public.agent_run_steps,public.agent_proposals in share row exclusive mode;
create or replace function public.enforce_account_capacity() returns trigger
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
 end if;
   if tg_op<>'DELETE' then byte_delta:=byte_delta+octet_length(to_jsonb(new)::text); end if;
   if tg_op<>'INSERT' then byte_delta:=byte_delta-octet_length(to_jsonb(old)::text); end if;
 if slot_delta>0 and usage.active_workspaces+slot_delta>plan.workspace_limit then
   raise exception using errcode='P0001',message='PLAN_WORKSPACE_LIMIT';
 end if;
 if byte_delta>0 and slot_delta>=0 and usage.content_bytes+byte_delta>plan.storage_limit_bytes then
   raise exception using errcode='P0001',message='PLAN_STORAGE_LIMIT';
 end if;
 update public.account_usage set content_bytes=greatest(0,content_bytes+byte_delta),active_workspaces=greatest(0,active_workspaces+slot_delta) where user_id=owner_id;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger zz_account_capacity before insert or update or delete on public.profiles for each row execute function public.enforce_account_capacity();
create trigger zz_account_capacity before insert or update or delete on public.career_preferences for each row execute function public.enforce_account_capacity();
create trigger zz_account_capacity before insert or update or delete on public.opportunity_events for each row execute function public.enforce_account_capacity();
create trigger zz_account_capacity before insert or update or delete on public.notifications for each row execute function public.enforce_account_capacity();
create trigger zz_account_capacity before insert or update or delete on public.agent_preferences for each row execute function public.enforce_account_capacity();
create trigger zz_account_capacity before insert or update or delete on public.notification_preferences for each row execute function public.enforce_account_capacity();
update public.account_usage set content_bytes=0;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.profiles t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.career_preferences t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.search_projects t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.opportunity_events t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.notifications t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.agent_preferences t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.notification_preferences t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.jobs t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.opportunities t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.tasks t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.opportunity_notes t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.documents t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.document_versions t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.contacts t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.interviews t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.application_records t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.agent_conversations t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.agent_messages t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.ai_runs t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.agent_run_steps t group by user_id) s where u.user_id=s.user_id;
update public.account_usage u set content_bytes=content_bytes+s.bytes from (select user_id,sum(octet_length(to_jsonb(t)::text))::bigint bytes from public.agent_proposals t group by user_id) s where u.user_id=s.user_id;
create or replace function public.request_plan_payment(input_plan text) returns uuid
language plpgsql security definer set search_path='' as $$
declare plan public.plan_catalog; settings public.billing_settings; request_id uuid; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.account_usage where user_id=auth.uid() for update;
 if (select count(*) from public.payment_requests where user_id=auth.uid() and created_at>now()-interval '24 hours')>=3 then raise exception 'PAYMENT_REQUEST_LIMIT'; end if;
 select * into plan from public.plan_catalog where slug=input_plan for share;
 select * into settings from public.billing_settings where id for share;
 if plan.slug is null or plan.slug='free' or plan.availability<>'available' or not settings.enabled then raise exception 'This plan is not accepting payments'; end if;
 insert into public.payment_requests(user_id,plan_slug,amount_minor,currency,instructions_snapshot)
 values(auth.uid(),plan.slug,plan.price_minor,plan.currency,to_jsonb(settings)-'id'-'updated_at') returning id into request_id;
 return request_id;
end $$;

create index payment_requests_account_created on public.payment_requests(user_id,created_at desc);
create view public.payment_request_summaries with (security_invoker=true) as
select id,user_id,plan_slug,amount_minor,currency,instructions_snapshot-'qr_image' as instructions_snapshot,status,transfer_reference,review_note,created_at,reviewed_at,reviewed_by from public.payment_requests;
grant select on public.payment_request_summaries to authenticated;
