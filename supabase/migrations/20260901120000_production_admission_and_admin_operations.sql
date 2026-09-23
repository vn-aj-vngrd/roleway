-- Production admission controls, account operations, and admin data insights.
create table public.platform_settings (
  singleton boolean primary key default true check (singleton),
  registration_enabled boolean not null default true,
  signup_limit integer not null default 200 check (signup_limit between 1 and 1000000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (singleton, registration_enabled, signup_limit)
values (true, true, 200)
on conflict (singleton) do nothing;

alter table public.platform_settings enable row level security;

create or replace function public.signup_admission_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'registrationEnabled', settings.registration_enabled,
    'signupLimit', settings.signup_limit,
    'accountCount', (select count(*) from auth.users where deleted_at is null),
    'remaining', greatest(settings.signup_limit - (select count(*) from auth.users where deleted_at is null), 0),
    'acceptingSignups', settings.registration_enabled
      and (select count(*) from auth.users where deleted_at is null) < settings.signup_limit
  )
  from public.platform_settings settings
  where settings.singleton = true;
$$;

revoke all on function public.signup_admission_status() from public;
grant execute on function public.signup_admission_status() to anon, authenticated;

create or replace function public.enforce_signup_admission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.platform_settings%rowtype;
  current_accounts integer;
begin
  -- Serialize admission decisions so concurrent registrations cannot exceed the cap.
  perform pg_advisory_xact_lock(hashtext('roleway-signup-admission'));
  select * into settings from public.platform_settings where singleton = true;
  select count(*) into current_accounts from auth.users where deleted_at is null;

  if settings.registration_enabled is not true then
    raise exception 'Roleway registrations are currently closed' using errcode = 'P0001';
  end if;
  if current_accounts >= settings.signup_limit then
    raise exception 'Roleway has reached its current account limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_admission_before_insert on auth.users;
create trigger enforce_signup_admission_before_insert
before insert on auth.users
for each row execute function public.enforce_signup_admission();

create or replace function public.can_manage_roleway_users()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

revoke all on function public.can_manage_roleway_users() from public;
grant execute on function public.can_manage_roleway_users() to authenticated;

create or replace function public.admin_target_is_manageable(input_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_roleway_users()
    and input_user_id <> auth.uid()
    and exists (select 1 from auth.users where id = input_user_id and deleted_at is null)
    and not exists (
      select 1 from public.admin_members where user_id = input_user_id and role = 'owner'
    );
$$;

revoke all on function public.admin_target_is_manageable(uuid) from public;
grant execute on function public.admin_target_is_manageable(uuid) to authenticated;

create or replace function public.admin_update_registration_policy(
  input_registration_enabled boolean,
  input_signup_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_settings public.platform_settings%rowtype;
begin
  if not public.can_manage_roleway_users() then
    raise exception 'Admin manager access required' using errcode = '42501';
  end if;
  if input_signup_limit not between 1 and 1000000 then
    raise exception 'Signup limit must be between 1 and 1000000';
  end if;

  select * into previous_settings from public.platform_settings where singleton = true for update;
  update public.platform_settings
  set registration_enabled = input_registration_enabled,
      signup_limit = input_signup_limit,
      updated_by = auth.uid(),
      updated_at = now()
  where singleton = true;

  insert into public.admin_audit_logs (actor_user_id, action, metadata)
  values (
    auth.uid(),
    'registration_policy_changed',
    jsonb_build_object(
      'registrationEnabledFrom', previous_settings.registration_enabled,
      'registrationEnabledTo', input_registration_enabled,
      'signupLimitFrom', previous_settings.signup_limit,
      'signupLimitTo', input_signup_limit
    )
  );
end;
$$;

revoke all on function public.admin_update_registration_policy(boolean, integer) from public;
grant execute on function public.admin_update_registration_policy(boolean, integer) to authenticated;

create or replace function public.admin_record_user_status_change(
  input_user_id uuid,
  input_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_target_is_manageable(input_user_id) then
    raise exception 'Target account cannot be managed' using errcode = '42501';
  end if;
  if input_status not in ('suspended', 'active') then
    raise exception 'Invalid account status';
  end if;

  insert into public.admin_audit_logs (actor_user_id, action, target_user_id, metadata)
  values (auth.uid(), 'user_status_changed', input_user_id, jsonb_build_object('status', input_status));
end;
$$;

revoke all on function public.admin_record_user_status_change(uuid, text) from public;
grant execute on function public.admin_record_user_status_change(uuid, text) to authenticated;

create or replace function public.admin_data_overview()
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
    'records', jsonb_build_object(
      'workspaces', (select count(*) from public.search_projects),
      'jobs', (select count(*) from public.jobs),
      'opportunities', (select count(*) from public.opportunities),
      'tasks', (select count(*) from public.tasks),
      'applications', (select count(*) from public.application_records),
      'interviews', (select count(*) from public.interviews),
      'contacts', (select count(*) from public.contacts),
      'documents', (select count(*) from public.documents),
      'documentVersions', (select count(*) from public.document_versions),
      'notifications', (select count(*) from public.notifications),
      'agentConversations', (select count(*) from public.agent_conversations),
      'agentRuns', (select count(*) from public.ai_runs)
    ),
    'quality', jsonb_build_object(
      'accountsWithoutOnboarding', (select count(*) from auth.users u left join public.profiles p on p.user_id = u.id where u.deleted_at is null and coalesce(p.onboarding_completed, false) = false),
      'accountsInactive30d', (select count(*) from auth.users where deleted_at is null and coalesce(last_sign_in_at, created_at) < now() - interval '30 days'),
      'archivedWorkspaces', (select count(*) from public.search_projects where status = 'archived'),
      'jobsNotTracked', (select count(*) from public.jobs j where not exists (select 1 from public.opportunities o where o.job_id = j.id)),
      'activeOpportunitiesWithoutNextAction', (select count(*) from public.opportunities where stage <> 'closed' and nullif(trim(next_action), '') is null)
    ),
    'generatedAt', now()
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_data_overview() from public;
grant execute on function public.admin_data_overview() to authenticated;

create or replace function public.admin_user_list(input_query text default '', input_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(coalesce(input_query, '')));
  safe_limit integer := least(greatest(input_limit, 1), 250);
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
    'adminRole', users.admin_role,
    'suspended', users.banned_until is not null and users.banned_until > now()
  ) order by users.created_at desc), '[]'::jsonb) into result
  from (
    select
      u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until,
      p.full_name, coalesce(p.onboarding_completed, false) as onboarding_completed,
      (select count(*) from public.search_projects sp where sp.user_id = u.id and sp.status <> 'archived') as projects,
      (select count(*) from public.jobs j where j.user_id = u.id) as jobs,
      (select count(*) from public.opportunities o where o.user_id = u.id) as opportunities,
      (select count(*) from public.application_records a where a.user_id = u.id) as applications,
      am.role as admin_role
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.admin_members am on am.user_id = u.id
    where u.deleted_at is null and (
      normalized = ''
      or lower(coalesce(u.email, '')) like '%' || normalized || '%'
      or lower(coalesce(p.full_name, '')) like '%' || normalized || '%'
    )
    order by u.created_at desc
    limit safe_limit
  ) users;

  return result;
end;
$$;

revoke all on function public.admin_user_list(text, integer) from public;
grant execute on function public.admin_user_list(text, integer) to authenticated;

create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('search', 'export')),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_roleway_api_quota(input_bucket text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  maximum integer;
  window_size interval;
  current_row public.api_rate_limits%rowtype;
begin
  if actor_id is null then return false; end if;
  case input_bucket
    when 'search' then maximum := 60; window_size := interval '1 minute';
    when 'export' then maximum := 3; window_size := interval '1 hour';
    else return false;
  end case;

  insert into public.api_rate_limits (user_id, bucket, request_count)
  values (actor_id, input_bucket, 0)
  on conflict (user_id, bucket) do nothing;

  select * into current_row from public.api_rate_limits
  where user_id = actor_id and bucket = input_bucket
  for update;

  if current_row.window_started_at <= now() - window_size then
    update public.api_rate_limits
    set window_started_at = now(), request_count = 1
    where user_id = actor_id and bucket = input_bucket;
    return true;
  end if;
  if current_row.request_count >= maximum then return false; end if;

  update public.api_rate_limits
  set request_count = request_count + 1
  where user_id = actor_id and bucket = input_bucket;
  return true;
end;
$$;

revoke all on function public.consume_roleway_api_quota(text) from public;
grant execute on function public.consume_roleway_api_quota(text) to authenticated;
