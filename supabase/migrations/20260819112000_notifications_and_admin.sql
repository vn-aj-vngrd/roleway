create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_reminders boolean not null default true,
  interview_reminders boolean not null default true,
  pipeline_updates boolean not null default true,
  weekly_summary boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "notification_preferences_owned" on public.notification_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create or replace function public.create_workspace_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'interviews' and tg_op = 'INSERT' then
    insert into public.notifications (user_id, notification_type, title, href)
    values (new.user_id, 'interview', 'Interview scheduled', '/opportunities/' || new.opportunity_id::text);
  elsif tg_table_name = 'opportunities' and tg_op = 'UPDATE' and old.stage is distinct from new.stage then
    insert into public.notifications (user_id, notification_type, title, href)
    values (new.user_id, 'pipeline', 'Opportunity moved to ' || initcap(new.stage::text), '/opportunities/' || new.id::text);
  end if;
  return new;
end;
$$;

create trigger interviews_notify after insert on public.interviews
  for each row execute function public.create_workspace_notification();
create trigger opportunity_stage_notify after update of stage on public.opportunities
  for each row execute function public.create_workspace_notification();

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  result jsonb;
begin
  if caller_email <> 'vanajvanguardia@gmail.com' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'onboarded', (select count(*) from public.profiles where onboarding_completed),
    'jobs', (select count(*) from public.jobs),
    'opportunities', (select count(*) from public.opportunities),
    'documents', (select count(*) from public.documents),
    'recentUsers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'email', recent.email,
        'name', recent.full_name,
        'createdAt', recent.created_at,
        'onboarded', recent.onboarding_completed
      ) order by recent.created_at desc)
      from (
        select u.id, u.email, u.created_at, p.full_name, coalesce(p.onboarding_completed, false) as onboarding_completed
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        order by u.created_at desc
        limit 20
      ) recent
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;
