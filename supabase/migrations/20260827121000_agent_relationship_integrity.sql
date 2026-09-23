-- Defense in depth for Agent child records and proposed Opportunity targets.

create or replace function public.assign_agent_child_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare derived_project_id uuid;
begin
  select project_id into derived_project_id
  from public.agent_conversations
  where id = new.conversation_id and user_id = new.user_id;
  if derived_project_id is null then raise exception 'The Agent conversation is not available'; end if;
  if new.project_id is not null and new.project_id <> derived_project_id then
    raise exception 'Agent records must belong to the conversation Workspace';
  end if;
  if new.run_id is not null and not exists (
    select 1 from public.ai_runs
    where id = new.run_id
      and user_id = new.user_id
      and project_id = derived_project_id
      and conversation_id = new.conversation_id
  ) then
    raise exception 'Agent records must reference a Run from the same conversation';
  end if;
  new.project_id := derived_project_id;
  return new;
end;
$$;

create or replace function public.validate_agent_proposal_target()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.target_type = 'opportunity' and (
    new.target_id is null or not exists (
      select 1 from public.opportunities
      where id = new.target_id and user_id = new.user_id and project_id = new.project_id
    )
  ) then
    raise exception 'The proposed Opportunity must belong to the conversation Workspace';
  end if;
  if new.target_type in ('account', 'workspace') and new.target_id is not null then
    raise exception 'Account and Workspace proposals do not accept an Opportunity target';
  end if;
  return new;
end;
$$;

create trigger agent_proposals_validate_target before insert or update of target_type, target_id, project_id, user_id
  on public.agent_proposals for each row execute function public.validate_agent_proposal_target();
