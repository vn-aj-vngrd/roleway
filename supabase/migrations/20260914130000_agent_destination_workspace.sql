-- Conversation attribution stays stable; proposals record their exact destination.
alter table public.agent_proposals
  add column destination_project_id uuid references public.search_projects(id) on delete restrict;

update public.agent_proposals p
set destination_project_id = o.project_id
from public.opportunities o
where p.target_type = 'opportunity' and p.target_id = o.id and p.user_id = o.user_id;

create or replace function public.validate_agent_proposal_target()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare destination uuid;
begin
  if new.target_type = 'opportunity' then
    select o.project_id into destination from public.opportunities o
    join public.search_projects w on w.id = o.project_id and w.user_id = new.user_id
    where o.id = new.target_id and o.user_id = new.user_id;
    if destination is null then
      raise exception 'The proposed Opportunity is not available';
    end if;
    if new.destination_project_id is not null and new.destination_project_id <> destination then
      raise exception 'The proposed destination Workspace does not match its Opportunity';
    end if;
    new.destination_project_id := destination;
  elsif new.target_id is not null or new.destination_project_id is not null then
    raise exception 'Account proposals do not accept an existing target';
  end if;
  return new;
end;
$$;

drop trigger agent_proposals_validate_target on public.agent_proposals;
create trigger agent_proposals_validate_target
before insert or update of target_type, target_id, project_id, destination_project_id, user_id
on public.agent_proposals for each row execute function public.validate_agent_proposal_target();

comment on column public.agent_proposals.destination_project_id is
  'Exact approved Opportunity Workspace; project_id remains conversation attribution. Null for creating a new Workspace.';

-- Commit the answer, proposals, steps, and final run status together.
create function public.complete_agent_run(input_run_id uuid, input_output jsonb, input_tokens integer, output_tokens integer)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.ai_runs; proposal jsonb;
begin
  select * into r from public.ai_runs where id = input_run_id for update;
  if r.id is null or r.status <> 'generating' or r.conversation_id is null then
    raise exception 'Agent run is not generating';
  end if;
  insert into public.agent_messages(user_id, project_id, conversation_id, run_id, role, content)
  values(r.user_id, r.project_id, r.conversation_id, r.id, 'agent', input_output->>'message');
  for proposal in select value from jsonb_array_elements(input_output->'proposals') loop
    insert into public.agent_proposals(user_id, project_id, conversation_id, run_id, tool_name, target_type, target_id, summary, arguments)
    values(r.user_id, r.project_id, r.conversation_id, r.id, proposal->>'tool',
      case when proposal->>'tool' = 'create_workspace' then 'account' else 'opportunity' end,
      (proposal->>'targetId')::uuid, proposal->>'summary', proposal);
  end loop;
  insert into public.agent_run_steps(user_id, project_id, conversation_id, run_id, label, status, position)
  values
    (r.user_id,r.project_id,r.conversation_id,r.id,'Read account and Workspace context','completed',1),
    (r.user_id,r.project_id,r.conversation_id,r.id,'Generated a reviewable answer','completed',2);
  update public.ai_runs set
    status = case when jsonb_array_length(input_output->'proposals') > 0 then 'awaiting_approval' else 'completed' end,
    output = input_output, input_tokens = complete_agent_run.input_tokens, output_tokens = complete_agent_run.output_tokens
  where id = r.id;
  update public.agent_conversations set updated_at = now() where id = r.conversation_id;
end;
$$;
revoke all on function public.complete_agent_run(uuid,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.complete_agent_run(uuid,jsonb,integer,integer) to service_role;

-- A row lock makes repeat approval idempotent. A failed mutation rolls back the decision too.
create function public.decide_agent_proposal(input_proposal_id uuid, input_decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.agent_proposals; o public.opportunities; record_id uuid; args jsonb;
begin
  if auth.uid() is null or input_decision is null or input_decision not in ('approve','reject') then
    raise exception 'Invalid proposal decision';
  end if;
  select * into p from public.agent_proposals where id = input_proposal_id and user_id = auth.uid() for update;
  if p.id is null then raise exception 'Proposal unavailable'; end if;
  if p.status <> 'proposed' then return null; end if;
  perform 1 from public.ai_runs where id = p.run_id for update;
  if input_decision = 'reject' then
    update public.agent_proposals set status = 'rejected', decided_at = now() where id = p.id;
  else
    args := p.arguments;
    if args->>'tool' is distinct from p.tool_name or (args->>'targetId')::uuid is distinct from p.target_id then
      raise exception 'Proposal arguments do not match the target';
    end if;
    if p.created_at < now() - interval '7 days' then
      update public.agent_proposals set status = 'expired', decided_at = now() where id = p.id;
    else
      if p.tool_name = 'create_workspace' then
        insert into public.search_projects(user_id,name,objective)
        values(auth.uid(),args->>'name',coalesce(nullif(args->>'objective',''),'Run a focused search for the right next role'))
        returning id into record_id;
      else
        select * into o from public.opportunities where id = p.target_id and user_id = auth.uid() for update;
        if o.id is null or o.project_id is distinct from p.destination_project_id or not exists (
          select 1 from public.search_projects where id = o.project_id and user_id = auth.uid() and status <> 'archived'
        ) then raise exception 'The target Workspace is no longer available'; end if;
        if p.tool_name = 'create_task' then
          insert into public.tasks(user_id,project_id,opportunity_id,title,category,status,priority,due_at,created_by)
          values(auth.uid(),o.project_id,o.id,args->>'title','admin','todo','normal',(args->>'dueAt')::timestamptz,'agent') returning id into record_id;
        elsif p.tool_name = 'set_next_action' then
          update public.opportunities set next_action = args->>'title',next_action_due_at = (args->>'dueAt')::timestamptz where id = o.id;
          record_id := o.id;
        elsif p.tool_name = 'create_note' then
          insert into public.opportunity_notes(user_id,opportunity_id,body)
          values(auth.uid(),o.id,args->>'body') returning id into record_id;
        else raise exception 'Unsupported Agent tool'; end if;
        insert into public.opportunity_events(user_id,opportunity_id,actor,event_type,payload)
        values(auth.uid(),o.id,'agent','agent_proposal_applied',jsonb_build_object('proposal_id',p.id,'tool',p.tool_name));
      end if;
      update public.agent_proposals set status='applied',decided_at=now(),applied_at=now(),error_code=null where id=p.id;
    end if;
  end if;
  update public.ai_runs set status='completed' where id=p.run_id and status='awaiting_approval'
    and not exists(select 1 from public.agent_proposals where run_id=p.run_id and status in ('proposed','applying'));
  return record_id;
end;
$$;
revoke all on function public.decide_agent_proposal(uuid,text) from public, anon;
grant execute on function public.decide_agent_proposal(uuid,text) to authenticated;
