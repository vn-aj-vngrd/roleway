-- Pending and abandoned email signups do not consume active account capacity.
create or replace function public.signup_admission_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'registrationEnabled', settings.registration_enabled,
    'signupLimit', settings.signup_limit,
    'accountCount', accounts.total,
    'remaining', greatest(settings.signup_limit - accounts.total, 0),
    'acceptingSignups', settings.registration_enabled and accounts.total < settings.signup_limit
  )
  from public.platform_settings settings
  cross join (select count(*) as total from auth.users where deleted_at is null and email_confirmed_at is not null) accounts
  where settings.singleton = true;
$$;

create or replace function public.enforce_signup_admission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  settings public.platform_settings%rowtype;
  current_accounts integer;
begin
  -- Confirmation must claim a slot too; queued signups cannot bypass the cap.
  perform pg_advisory_xact_lock(hashtext('roleway-signup-admission'));
  select * into settings from public.platform_settings where singleton = true;
  select count(*) into current_accounts from auth.users
    where deleted_at is null and email_confirmed_at is not null;
  if settings.registration_enabled is not true then
    raise exception 'Roleway registrations are currently closed' using errcode = 'P0001';
  end if;
  if current_accounts >= settings.signup_limit then
    raise exception 'Roleway has reached its current account limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_signup_admission_before_confirmation
before update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.enforce_signup_admission();

-- Provision product records only for activated accounts. Preserve all existing data.
drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row when (new.email_confirmed_at is not null)
execute function public.handle_new_user();

create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.handle_new_user();
