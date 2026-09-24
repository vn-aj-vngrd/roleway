-- Revisions retire only explicitly referenced pending proposals, atomically with the replacement.
-- Existing proposals and provider payloads without a revision id remain compatible.
create or replace function public.complete_agent_run(input_run_id uuid, input_output jsonb, input_tokens integer, output_tokens integer)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.ai_runs; proposal jsonb; previous public.agent_proposals; revision_id uuid;
begin
  -- Serialize completion and approval in the same conversation, including revision races.
  perform 1 from public.agent_conversations where id = (select conversation_id from public.ai_runs where id = input_run_id) for update;
  select * into r from public.ai_runs where id = input_run_id for update;
  if r.id is null or r.status <> 'generating' or r.conversation_id is null then
    raise exception 'Agent run is not generating';
  end if;
  insert into public.agent_messages(user_id, project_id, conversation_id, run_id, role, content)
  values(r.user_id, r.project_id, r.conversation_id, r.id, 'agent', input_output->>'message');
  for proposal in select value from jsonb_array_elements(input_output->'proposals') loop
    revision_id := nullif(proposal->>'supersedesProposalId', '')::uuid;
    if revision_id is not null then
      select * into previous from public.agent_proposals where id = revision_id for update;
      if previous.id is null or previous.user_id <> r.user_id
        or previous.conversation_id <> r.conversation_id
        or previous.tool_name is distinct from proposal->>'tool'
        or previous.status <> 'proposed' then
        raise exception 'Proposal revision is no longer available';
      end if;
      update public.agent_proposals set status = 'superseded', decided_at = now() where id = revision_id;
      update public.ai_runs set status = 'completed' where id = previous.run_id and status = 'awaiting_approval'
        and not exists (select 1 from public.agent_proposals where run_id = previous.run_id and status in ('proposed', 'applying'));
    end if;
    insert into public.agent_proposals(user_id, project_id, conversation_id, run_id, tool_name, target_type, target_id, summary, arguments, expected_next_action)
    values(r.user_id, r.project_id, r.conversation_id, r.id, proposal->>'tool',
      case when proposal->>'tool' = 'create_workspace' then 'account' else 'opportunity' end,
      (proposal->>'targetId')::uuid, proposal->>'summary', proposal, nullif(proposal->'expectedNextAction', 'null'::jsonb));
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

create or replace function public.decide_agent_proposal(input_proposal_id uuid, input_decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.agent_proposals; o public.opportunities; record_id uuid; args jsonb;
begin
  if auth.uid() is null or input_decision is null or input_decision not in ('approve','reject') then
    raise exception 'Invalid proposal decision';
  end if;
  perform 1 from public.agent_conversations where id = (
    select conversation_id from public.agent_proposals where id = input_proposal_id and user_id = auth.uid()
  ) and user_id = auth.uid() for update;
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
        if o.id is null or o.stage = 'closed' or o.project_id is distinct from p.destination_project_id or not exists (
          select 1 from public.search_projects where id = o.project_id and user_id = auth.uid() and status <> 'archived'
        ) then raise exception 'The target Workspace is no longer available'; end if;
        if p.tool_name = 'set_next_action' and (p.expected_next_action is null
          or o.next_action is distinct from p.expected_next_action->>'title'
          or o.next_action_due_at is distinct from (p.expected_next_action->>'dueAt')::timestamptz) then
          update public.agent_proposals set status='expired',decided_at=now() where id=p.id;
        else
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
      end if;
      update public.agent_proposals set status='applied',decided_at=now(),applied_at=now(),error_code=null where id=p.id and status='proposed';
    end if;
  end if;
  update public.ai_runs set status='completed' where id=p.run_id and status='awaiting_approval'
    and not exists(select 1 from public.agent_proposals where run_id=p.run_id and status in ('proposed','applying'));
  return record_id;
end;
$$;
revoke all on function public.decide_agent_proposal(uuid,text) from public, anon;
grant execute on function public.decide_agent_proposal(uuid,text) to authenticated;
