-- Preserve the existing approval boundary while adding two internal record types.
alter table public.agent_proposals drop constraint agent_proposals_tool_name_check;
alter table public.agent_proposals add constraint agent_proposals_tool_name_check
  check (tool_name in ('create_workspace','create_task','set_next_action','create_note','create_interview','create_contact'));
alter table public.agent_proposals add column applied_record_id uuid;
comment on column public.agent_proposals.applied_record_id is 'Record created by an approved proposal; validated against its owner and Workspace when opened.';

create or replace function public.validate_agent_proposal_target()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare destination uuid; details jsonb;
begin
  if new.target_type = 'opportunity' then
    select o.project_id into destination from public.opportunities o
    join public.search_projects w on w.id=o.project_id and w.user_id=new.user_id and w.status <> 'archived'
    where o.id=new.target_id and o.user_id=new.user_id;
    if destination is null then raise exception 'The proposed Opportunity is not available'; end if;
  elsif new.tool_name='create_contact' and new.target_type='workspace' and new.target_id is null then
    select id into destination from public.search_projects
    where id=(new.arguments->>'workspaceId')::uuid and user_id=new.user_id and status <> 'archived';
    if destination is null then raise exception 'The contact Workspace is not available'; end if;
  elsif new.target_id is not null or new.destination_project_id is not null then
    raise exception 'Account proposals do not accept an existing target';
  end if;
  if new.destination_project_id is not null and new.destination_project_id is distinct from destination then
    raise exception 'The proposed destination Workspace does not match its target';
  end if;
  new.destination_project_id := destination;
  if new.tool_name in ('create_contact','create_interview') then
    if new.arguments->>'tool' is distinct from new.tool_name
      or (new.arguments->>'targetId')::uuid is distinct from new.target_id
      or exists(select 1 from public.agent_conversations c where c.id=new.conversation_id and c.scope_mode='workspace' and c.project_id is distinct from destination) then
      raise exception 'Proposal arguments do not match the conversation scope';
    end if;
  end if;
  if new.tool_name='create_contact' then
    details := new.arguments->'contact';
    if (new.arguments->>'workspaceId')::uuid is distinct from destination
      or jsonb_typeof(details) is distinct from 'object'
      or coalesce(length(trim(details->>'name')),0) not between 1 and 160
      or coalesce(details->>'relationship','') not in ('recruiter','hiring_manager','interviewer','referral','colleague','contact')
      or length(details->>'role')>180 or length(details->>'company')>160 or length(details->>'phone')>80 or length(details->>'notes')>20000
      or (details->>'email' is not null and details->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
      or (details->>'profileUrl' is not null and details->>'profileUrl' !~ '^https?://[^[:space:]]+$') then
      raise exception 'Invalid contact details';
    end if;
    if details->>'followUpAt' is not null and (details->>'followUpAt' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' or not isfinite((details->>'followUpAt')::timestamptz)) then raise exception 'Invalid contact follow-up time'; end if;
  elsif new.tool_name='create_interview' then
    details := new.arguments->'interview';
    if new.target_type <> 'opportunity' or destination is null
      or jsonb_typeof(details) is distinct from 'object'
      or coalesce(length(trim(details->>'interviewType')),0) not between 1 and 120
      or coalesce(details->>'durationMinutes','') !~ '^[0-9]+$'
      or (details->>'durationMinutes')::integer not between 5 and 1440
      or coalesce(details->>'startsAt','') !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
      or not isfinite((details->>'startsAt')::timestamptz)
      or not exists(select 1 from pg_catalog.pg_timezone_names where name=details->>'timezone')
      or length(details->>'interviewers')>2000
      or (details->>'meetingUrl' is not null and details->>'meetingUrl' !~ '^https?://[^[:space:]]+$') then
      raise exception 'Invalid interview schedule';
    end if;
  end if;
  return new;
end;
$$;
drop trigger agent_proposals_validate_target on public.agent_proposals;
create trigger agent_proposals_validate_target before insert or update of target_type,target_id,project_id,destination_project_id,user_id,arguments,tool_name
on public.agent_proposals for each row execute function public.validate_agent_proposal_target();

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
      case when proposal->>'tool' = 'create_workspace' then 'account' when proposal->>'tool' = 'create_contact' and proposal->>'targetId' is null then 'workspace' else 'opportunity' end,
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
declare p public.agent_proposals; o public.opportunities; record_id uuid; args jsonb; details jsonb; destination uuid;
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
      elsif p.tool_name = 'create_contact' then
        destination := (args->>'workspaceId')::uuid;
        perform 1 from public.search_projects where id=destination and id=p.destination_project_id and user_id=auth.uid() and status <> 'archived' for update;
        if not found then raise exception 'The target Workspace is no longer available'; end if;
        if p.target_id is not null then
          select * into o from public.opportunities where id=p.target_id and user_id=auth.uid() and project_id=destination and stage <> 'closed' for update;
          if not found then raise exception 'The target Opportunity is no longer available'; end if;
        end if;
        details := args->'contact';
        if exists(select 1 from public.contacts c where c.user_id=auth.uid() and c.project_id=destination and (
          (details->>'email' is not null and lower(c.email)=lower(details->>'email')) or
          (lower(trim(c.name))=lower(trim(details->>'name')) and lower(coalesce(c.company,''))=lower(coalesce(details->>'company','')))
        )) then raise exception 'A matching contact already exists in this Workspace'; end if;
        insert into public.contacts(user_id,project_id,opportunity_id,name,relationship,role,company,email,phone,profile_url,notes,follow_up_at)
        values(auth.uid(),destination,p.target_id,details->>'name',details->>'relationship',coalesce(details->>'role',''),coalesce(details->>'company',''),details->>'email',details->>'phone',details->>'profileUrl',coalesce(details->>'notes',''),(details->>'followUpAt')::timestamptz)
        returning id into record_id;
        if p.target_id is not null then
          insert into public.opportunity_events(user_id,opportunity_id,actor,event_type,payload)
          values(auth.uid(),p.target_id,'agent','contact_added',jsonb_build_object('contact_id',record_id,'name',details->>'name','relationship',details->>'relationship','proposal_id',p.id));
        end if;
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
        elsif p.tool_name = 'create_interview' then
          details := args->'interview';
          if exists(select 1 from public.interviews i where i.opportunity_id=o.id and i.user_id=auth.uid() and i.starts_at=(details->>'startsAt')::timestamptz and lower(i.interview_type)=lower(details->>'interviewType') and i.status <> 'cancelled') then
            raise exception 'A matching interview already exists for this Opportunity';
          end if;
          record_id := public.schedule_interview(o.id,details->>'interviewType',(details->>'startsAt')::timestamptz,(details->>'durationMinutes')::integer,details->>'meetingUrl',details->>'timezone',coalesce(details->>'interviewers',''));
        elsif p.tool_name = 'create_note' then
          insert into public.opportunity_notes(user_id,opportunity_id,body)
          values(auth.uid(),o.id,args->>'body') returning id into record_id;
        else raise exception 'Unsupported Agent tool'; end if;
        insert into public.opportunity_events(user_id,opportunity_id,actor,event_type,payload)
        values(auth.uid(),o.id,'agent','agent_proposal_applied',jsonb_build_object('proposal_id',p.id,'tool',p.tool_name));
        end if;
      end if;
      update public.agent_proposals set status='applied',decided_at=now(),applied_at=now(),applied_record_id=record_id,error_code=null where id=p.id and status='proposed';
    end if;
  end if;
  update public.ai_runs set status='completed' where id=p.run_id and status='awaiting_approval'
    and not exists(select 1 from public.agent_proposals where run_id=p.run_id and status in ('proposed','applying'));
  return record_id;
end;
$$;
revoke all on function public.decide_agent_proposal(uuid,text) from public, anon;
grant execute on function public.decide_agent_proposal(uuid,text) to authenticated;

-- Update known stock wording and append new sections without replacing editorial content.
update public.help_articles set
 title=case when title='Create Workspaces, tasks, notes, and Next Actions with Agent' then 'Create work with Agent' else title end,
 body=replace(replace(body,
   'Under Create, choose Workspace, Task, Next Action, or Note.',
   'Under Create, choose Workspace, Task, Next Action, Note, Interview, or Contact.'),
   'Agent can propose Workspaces, Opportunity tasks, Opportunity notes, and Next Actions. It can also answer questions and prepare text through Explore. Jobs, Opportunities, contacts, interviews, and documents are created through their normal Roleway screens in this version.',
   'Agent can propose Workspaces, Opportunity tasks, Opportunity notes, Next Actions, interviews, and contacts. It can also answer questions and prepare text through Explore. Jobs, Opportunities, and documents are created through their normal Roleway screens.')
 where slug='agent-create';
update public.help_articles set body=body || E'\n\n' || $guide$## Create an interview
Choose Interview under Create. Confirm the Opportunity, interview type, date, time including AM/PM, timezone and duration. Supply a meeting URL and interviewer details if known. Review the exact schedule and Workspace on the approval card, then select Approve change. Approval records the interview, adds preparation work when needed, and moves eligible Opportunities to Interview. Select Open interview to review it. This does not send a calendar invitation.

## Create a contact
Choose Contact under Create. Confirm the Workspace, person’s name and relationship, and optionally link an Opportunity in that Workspace. Provide only the role, company, email, phone, profile URL, notes and follow-up time you want saved. Review every detail, then select Approve change. Select Open contact to review or edit the person. A follow-up appears in Home; no message is sent.

## Duplicate interviews and contacts
If a matching interview or contact already exists, creation stops without saving another record. Review the existing record in Interviews or Contacts. If these are different people or events, correct the identifying details in conversation and review the replacement proposal. Repeated approval never creates another copy.$guide$
where slug='agent-create' and position('## Create an interview' in body)=0;
update public.help_articles set body=body || E'\n\n' || $guide$## Create with Agent
You can also choose Interview under Agent → Create. Confirm the Opportunity, type, date, time, timezone and duration, then review and approve the exact schedule. This creates the same internal interview and preparation workflow; it does not send calendar invitations. See [Create with Agent](/help/agent-create).$guide$
where slug='interviews-and-preparation' and position('## Create with Agent' in body)=0;
update public.help_articles set body=body || E'\n\n' || $guide$## Create with Agent
You can also choose Contact under Agent → Create. Confirm the Workspace, name, relationship and optional Opportunity, then review and approve the details. Agent checks for likely duplicates and never sends messages. See [Create with Agent](/help/agent-create).$guide$
where slug='contacts-and-follow-ups' and position('## Create with Agent' in body)=0;
