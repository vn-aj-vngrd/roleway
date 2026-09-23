create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('warning', 'error')),
  category text not null check (char_length(category) between 1 and 80),
  code text not null check (char_length(code) between 1 and 120),
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index system_events_created_idx on public.system_events(level, created_at desc);
alter table public.system_events enable row level security;

create or replace function public.admin_system_health()
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
  select jsonb_build_object(
    'checkedAt', now(),
    'database', 'reachable',
    'applicationErrors24h', (select count(*) from public.system_events where level = 'error' and created_at >= now() - interval '24 hours'),
    'failedAiRuns24h', (select count(*) from public.ai_runs where status = 'failed' and created_at >= now() - interval '24 hours'),
    'providerConnectionsInError', (select count(*) from public.ai_connections where status = 'error'),
    'notifications24h', (select count(*) from public.notifications where created_at >= now() - interval '24 hours'),
    'scheduledInterviews7d', (select count(*) from public.interviews where status = 'scheduled' and starts_at between now() and now() + interval '7 days'),
    'adminActions30d', (select count(*) from public.admin_audit_logs where created_at >= now() - interval '30 days'),
    'recentErrors', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'code', code, 'createdAt', created_at) order by created_at desc)
      from (select category, code, created_at from public.system_events where level = 'error' order by created_at desc limit 10) recent
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;
