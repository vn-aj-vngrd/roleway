-- Built-in automations surface their work on Today; they should not generate duplicate notifications.
create or replace function public.create_workspace_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare enabled boolean;
begin
  if tg_table_name = 'interviews' then
    if tg_op = 'INSERT' then
      select coalesce((select interview_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'interview', 'Interview scheduled', '/preparation/' || new.id::text);
      end if;
    end if;
  elsif tg_table_name = 'opportunities' then
    if tg_op = 'UPDATE' and old.stage is distinct from new.stage then
      -- Scheduling an interview already creates a more useful interview notification.
      if new.stage = 'interview' and exists (
        select 1 from public.interviews i
        where i.opportunity_id = new.id and i.created_at >= statement_timestamp() - interval '10 seconds'
      ) then
        enabled := false;
      else
        select coalesce((select pipeline_updates from public.notification_preferences where user_id = new.user_id), true) into enabled;
      end if;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'pipeline', 'Opportunity moved to ' || initcap(new.stage::text), '/opportunities/' || new.id::text);
      end if;
    end if;
  elsif tg_table_name = 'tasks' then
    if tg_op = 'INSERT' and new.created_by = 'user' then
      select coalesce((select task_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'task', 'Task added · ' || new.title, case when new.opportunity_id is null then '/today' else '/opportunities/' || new.opportunity_id::text end);
      end if;
    end if;
  end if;
  return new;
end;
$$;
