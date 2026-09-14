-- Transactional fixtures; safe to repeat on a migrated disposable database.
begin;
create function pg_temp.assert_admission(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end;
$$;
do $$
declare
  first_id uuid := gen_random_uuid(); second_id uuid := gen_random_uuid();
  initial_count integer; rejected boolean := false;
begin
  select count(*) into initial_count from auth.users where deleted_at is null and email_confirmed_at is not null;
  update public.platform_settings set registration_enabled = true, signup_limit = initial_count + 1;
  insert into auth.users(id,email,created_at) values
    (first_id, 'e2e-admission-' || first_id || '@roleway.test', now() - interval '60 days'),
    (second_id, 'e2e-admission-' || second_id || '@roleway.test', now());
  perform pg_temp.assert_admission((public.signup_admission_status()->>'accountCount')::integer = initial_count, 'Pending accounts consumed capacity');
  perform pg_temp.assert_admission(not exists(select 1 from public.profiles where user_id in (first_id,second_id)), 'Pending signup provisioned a profile');
  perform pg_temp.assert_admission(not exists(select 1 from public.search_projects where user_id in (first_id,second_id)), 'Pending signup provisioned a Workspace');
  update auth.users set email_confirmed_at = now() where id = first_id;
  perform pg_temp.assert_admission(exists(select 1 from public.profiles where user_id = first_id and active_project_id is not null), 'Confirmation did not provision a Workspace');
  perform pg_temp.assert_admission((public.signup_admission_status()->>'remaining')::integer = 0, 'Confirmation did not consume capacity');
  begin
    update auth.users set email_confirmed_at = now() where id = second_id;
  exception when sqlstate 'P0001' then rejected := true;
  end;
  perform pg_temp.assert_admission(rejected, 'Pending signup bypassed the activation cap');
  perform pg_temp.assert_admission(not exists(select 1 from public.profiles where user_id = second_id), 'Rejected confirmation provisioned records');
  update auth.users set raw_user_meta_data = '{"full_name":"Still allowed"}' where id = first_id;
  update public.platform_settings set signup_limit = initial_count + 2, registration_enabled = false;
  rejected := false;
  begin
    update auth.users set email_confirmed_at = now() where id = second_id;
  exception when sqlstate 'P0001' then rejected := true;
  end;
  perform pg_temp.assert_admission(rejected, 'Confirmation bypassed closed registrations');
  update public.platform_settings set registration_enabled = true;
  update auth.users set email_confirmed_at = now() where id = second_id;
  perform pg_temp.assert_admission((select count(*) from public.search_projects where user_id = second_id) = 1, 'Confirmation did not provision exactly one Workspace');
end;
$$;
rollback;
