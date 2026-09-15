-- Allow over-limit accounts to archive, without allowing content growth in the same write.
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
     archive_only := (to_jsonb(new)-'status'-'updated_at') = (to_jsonb(old)-'status'-'updated_at');
   end if;
 end if;
   if tg_op<>'DELETE' then byte_delta:=byte_delta+octet_length(to_jsonb(new)::text); end if;
   if tg_op<>'INSERT' then byte_delta:=byte_delta-octet_length(to_jsonb(old)::text); end if;
 if slot_delta>0 and usage.active_workspaces+slot_delta>plan.workspace_limit then
   raise exception using errcode='P0001',message='PLAN_WORKSPACE_LIMIT';
 end if;
 if byte_delta>0 and not archive_only and usage.content_bytes+byte_delta>plan.storage_limit_bytes then
   raise exception using errcode='P0001',message='PLAN_STORAGE_LIMIT';
 end if;
 update public.account_usage set content_bytes=greatest(0,content_bytes+byte_delta),active_workspaces=greatest(0,active_workspaces+slot_delta) where user_id=owner_id;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
