create or replace function public.move_opportunity(input_opportunity_id uuid, input_stage public.opportunity_stage, input_closed_reason text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  previous_stage public.opportunity_stage;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if input_stage = 'closed' and nullif(trim(input_closed_reason), '') is null then
    raise exception 'A closed reason is required';
  end if;

  select stage into previous_stage
  from public.opportunities
  where id = input_opportunity_id and user_id = current_user_id
  for update;

  if previous_stage is null then raise exception 'Opportunity not found'; end if;
  if previous_stage = input_stage then return; end if;

  update public.opportunities
  set stage = input_stage,
      closed_reason = case when input_stage = 'closed' then trim(input_closed_reason) else null end
  where id = input_opportunity_id and user_id = current_user_id;

  insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
  values (current_user_id, input_opportunity_id, 'user', 'stage_changed', jsonb_build_object('from', previous_stage, 'to', input_stage, 'closed_reason', input_closed_reason));
end;
$$;

grant execute on function public.move_opportunity(uuid, public.opportunity_stage, text) to authenticated;
