-- Preserve redacted audit history without preventing account deletion.
alter table public.admin_audit_logs
  drop constraint admin_audit_logs_actor_user_id_fkey;

alter table public.admin_audit_logs
  alter column actor_user_id drop not null;

alter table public.admin_audit_logs
  add constraint admin_audit_logs_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;

create or replace function public.admin_audit_log_list(input_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_roleway_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', logs.id,
    'actorEmail', actor.email,
    'action', logs.action,
    'targetEmail', target.email,
    'metadata', logs.metadata,
    'createdAt', logs.created_at
  ) order by logs.created_at desc), '[]'::jsonb) into result
  from (
    select * from public.admin_audit_logs order by created_at desc limit least(greatest(input_limit, 1), 100)
  ) logs
  left join auth.users actor on actor.id = logs.actor_user_id
  left join auth.users target on target.id = logs.target_user_id;
  return result;
end;
$$;

revoke all on function public.admin_audit_log_list(integer) from public;
grant execute on function public.admin_audit_log_list(integer) to authenticated;
