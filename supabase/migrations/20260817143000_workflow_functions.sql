create or replace function public.track_job(input_job_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  opportunity_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.jobs where id = input_job_id and user_id = current_user_id) then
    raise exception 'Job not found';
  end if;

  insert into public.opportunities (user_id, job_id, stage, next_action)
  values (current_user_id, input_job_id, 'interested', 'Review requirements and decide whether to prepare')
  on conflict (user_id, job_id) do update set updated_at = now()
  returning id into opportunity_id;

  update public.jobs set inbox_state = 'tracked' where id = input_job_id and user_id = current_user_id;

  insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
  values (current_user_id, opportunity_id, 'user', 'opportunity_created', jsonb_build_object('job_id', input_job_id));

  return opportunity_id;
end;
$$;

grant execute on function public.track_job(uuid) to authenticated;
