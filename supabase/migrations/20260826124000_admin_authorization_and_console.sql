create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'support', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_members_updated_at before update on public.admin_members
  for each row execute function public.set_updated_at();
alter table public.admin_members enable row level security;

insert into public.admin_members (user_id, role)
select id, 'owner' from auth.users where lower(email) = 'vanajvanguardia@gmail.com'
on conflict (user_id) do nothing;

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
alter table public.admin_audit_logs enable row level security;

create or replace function public.is_roleway_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = auth.uid() and role in ('owner', 'admin', 'support', 'viewer')
  );
$$;

create or replace function public.is_roleway_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_roleway_admin() from public;
revoke all on function public.is_roleway_owner() from public;
grant execute on function public.is_roleway_admin() to authenticated;
grant execute on function public.is_roleway_owner() to authenticated;

create or replace function public.admin_dashboard()
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
    'users', (select count(*) from auth.users),
    'active7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'registrations30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'onboarded', (select count(*) from public.profiles where onboarding_completed),
    'projects', (select count(*) from public.search_projects where status <> 'archived'),
    'jobs', (select count(*) from public.jobs),
    'opportunities', (select count(*) from public.opportunities),
    'applications', (select count(*) from public.application_records),
    'interviews', (select count(*) from public.interviews),
    'documents', (select count(*) from public.documents),
    'aiRuns30d', (select count(*) from public.ai_runs where created_at >= now() - interval '30 days'),
    'failedAiRuns30d', (select count(*) from public.ai_runs where status = 'failed' and created_at >= now() - interval '30 days'),
    'recentUsers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'email', recent.email,
        'name', recent.full_name,
        'createdAt', recent.created_at,
        'lastSignInAt', recent.last_sign_in_at,
        'onboarded', recent.onboarding_completed,
        'projects', recent.projects,
        'opportunities', recent.opportunities
      ) order by recent.created_at desc)
      from (
        select
          u.id, u.email, u.created_at, u.last_sign_in_at, p.full_name,
          coalesce(p.onboarding_completed, false) as onboarding_completed,
          (select count(*) from public.search_projects sp where sp.user_id = u.id and sp.status <> 'archived') as projects,
          (select count(*) from public.opportunities o where o.user_id = u.id) as opportunities
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        order by u.created_at desc
        limit 12
      ) recent
    ), '[]'::jsonb),
    'events7d', coalesce((
      select jsonb_object_agg(event_type, event_count)
      from (
        select event_type, count(*) as event_count
        from public.opportunity_events
        where created_at >= now() - interval '7 days'
        group by event_type
      ) grouped
    ), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;

create or replace function public.admin_user_list(input_query text default '', input_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(coalesce(input_query, '')));
  safe_limit integer := least(greatest(input_limit, 1), 100);
  result jsonb;
begin
  if not public.is_roleway_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', users.id,
    'email', users.email,
    'name', users.full_name,
    'createdAt', users.created_at,
    'lastSignInAt', users.last_sign_in_at,
    'onboarded', users.onboarding_completed,
    'projects', users.projects,
    'jobs', users.jobs,
    'opportunities', users.opportunities,
    'applications', users.applications,
    'adminRole', users.admin_role
  ) order by users.created_at desc), '[]'::jsonb) into result
  from (
    select
      u.id, u.email, u.created_at, u.last_sign_in_at,
      p.full_name, coalesce(p.onboarding_completed, false) as onboarding_completed,
      (select count(*) from public.search_projects sp where sp.user_id = u.id and sp.status <> 'archived') as projects,
      (select count(*) from public.jobs j where j.user_id = u.id) as jobs,
      (select count(*) from public.opportunities o where o.user_id = u.id) as opportunities,
      (select count(*) from public.application_records a where a.user_id = u.id) as applications,
      am.role as admin_role
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.admin_members am on am.user_id = u.id
    where normalized = ''
      or lower(coalesce(u.email, '')) like '%' || normalized || '%'
      or lower(coalesce(p.full_name, '')) like '%' || normalized || '%'
    order by u.created_at desc
    limit safe_limit
  ) users;

  return result;
end;
$$;

revoke all on function public.admin_user_list(text, integer) from public;
grant execute on function public.admin_user_list(text, integer) to authenticated;

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
    'failedAiRuns24h', (select count(*) from public.ai_runs where status = 'failed' and created_at >= now() - interval '24 hours'),
    'providerConnectionsInError', (select count(*) from public.ai_connections where status = 'error'),
    'notifications24h', (select count(*) from public.notifications where created_at >= now() - interval '24 hours'),
    'scheduledInterviews7d', (select count(*) from public.interviews where status = 'scheduled' and starts_at between now() and now() + interval '7 days'),
    'adminActions30d', (select count(*) from public.admin_audit_logs where created_at >= now() - interval '30 days')
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;

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
  join auth.users actor on actor.id = logs.actor_user_id
  left join auth.users target on target.id = logs.target_user_id;
  return result;
end;
$$;

revoke all on function public.admin_audit_log_list(integer) from public;
grant execute on function public.admin_audit_log_list(integer) to authenticated;

create or replace function public.admin_set_member_role(input_user_id uuid, input_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  previous_role text;
begin
  if not public.is_roleway_owner() then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if input_role not in ('none', 'owner', 'admin', 'support', 'viewer') then raise exception 'Invalid admin role'; end if;
  if not exists (select 1 from auth.users where id = input_user_id) then raise exception 'User not found'; end if;
  select role into previous_role from public.admin_members where user_id = input_user_id;

  if input_role = 'none' then
    if previous_role = 'owner' and (select count(*) from public.admin_members where role = 'owner') <= 1 then
      raise exception 'The final owner cannot be removed';
    end if;
    delete from public.admin_members where user_id = input_user_id;
  else
    insert into public.admin_members (user_id, role) values (input_user_id, input_role)
    on conflict (user_id) do update set role = excluded.role;
  end if;

  insert into public.admin_audit_logs (actor_user_id, action, target_user_id, metadata)
  values (actor_id, 'admin_role_changed', input_user_id, jsonb_build_object('from', previous_role, 'to', input_role));
end;
$$;

revoke all on function public.admin_set_member_role(uuid, text) from public;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;

-- Preserve project initialization and bootstrap the configured owner through the role table.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_id uuid;
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  select active_project_id into project_id from public.profiles where user_id = new.id;
  if project_id is null then
    insert into public.search_projects (user_id, name, objective)
    values (new.id, 'My job search', 'Find the right next opportunity')
    returning id into project_id;
    update public.profiles set active_project_id = project_id where user_id = new.id;
  end if;

  if lower(coalesce(new.email, '')) = 'vanajvanguardia@gmail.com' then
    insert into public.admin_members (user_id, role) values (new.id, 'owner')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
