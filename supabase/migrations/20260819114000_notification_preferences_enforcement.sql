create or replace function public.create_workspace_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  enabled boolean;
begin
  if tg_table_name = 'interviews' and tg_op = 'INSERT' then
    select coalesce((select interview_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
    if enabled then
      insert into public.notifications (user_id, notification_type, title, href)
      values (new.user_id, 'interview', 'Interview scheduled', '/opportunities/' || new.opportunity_id::text);
    end if;
  elsif tg_table_name = 'opportunities' and tg_op = 'UPDATE' and old.stage is distinct from new.stage then
    select coalesce((select pipeline_updates from public.notification_preferences where user_id = new.user_id), true) into enabled;
    if enabled then
      insert into public.notifications (user_id, notification_type, title, href)
      values (new.user_id, 'pipeline', 'Opportunity moved to ' || initcap(new.stage::text), '/opportunities/' || new.id::text);
    end if;
  elsif tg_table_name = 'tasks' and tg_op = 'INSERT' then
    select coalesce((select task_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
    if enabled then
      insert into public.notifications (user_id, notification_type, title, href)
      values (new.user_id, 'task', 'Task added · ' || new.title, case when new.opportunity_id is null then '/today' else '/opportunities/' || new.opportunity_id::text end);
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_notify after insert on public.tasks
  for each row execute function public.create_workspace_notification();
