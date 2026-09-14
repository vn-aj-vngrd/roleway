-- Run against migrated disposable PostgreSQL or Supabase. All fixture rows roll back.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end;
$$;
do $$
<<agent_transactions>>
declare
  owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  origin_id uuid; destination_id uuid; job_id uuid; opportunity_id uuid;
  conversation_id uuid; run_id uuid; proposal_id uuid; result_id uuid;
  reply jsonb; proposal jsonb; rejected boolean := false; tool text;
begin
  insert into auth.users(id,email) values(owner_id,'agent-test-'||owner_id||'@roleway.test'),(other_id,'agent-test-'||other_id||'@roleway.test');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select active_project_id into origin_id from public.profiles where user_id=owner_id;
  insert into public.search_projects(user_id,name) values(owner_id,'Destination') returning id into destination_id;
  insert into public.jobs(user_id,project_id,company,title) values(owner_id,destination_id,'Fixture','Engineer') returning id into job_id;
  insert into public.opportunities(user_id,project_id,job_id,stage) values(owner_id,destination_id,job_id,'interested') returning id into opportunity_id;
  insert into public.agent_conversations(user_id,project_id,title) values(owner_id,origin_id,'Cross-workspace test') returning id into conversation_id;
  foreach tool in array array['create_task','set_next_action','create_note','create_workspace'] loop
    insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
    values(owner_id,origin_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
    proposal := jsonb_build_object('tool',tool,'summary','Review fixture change','targetId',case when tool='create_workspace' then null else opportunity_id end,
      'title','Prepare examples','body','Approved note','dueAt',null,'name','Agent workspace','objective','Focused search');
    reply := jsonb_build_object('message','Please review this change.','proposals',jsonb_build_array(proposal));
    perform public.complete_agent_run(run_id,reply,10,20);
    select id into proposal_id from public.agent_proposals where agent_proposals.run_id=agent_transactions.run_id;
    perform pg_temp.assert((select status='awaiting_approval' from public.ai_runs where id=run_id),'Run must await approval');
    if tool <> 'create_workspace' then
      perform pg_temp.assert((select destination_project_id=destination_id and project_id=origin_id from public.agent_proposals where id=proposal_id),'Destination must differ from conversation attribution');
    end if;
    perform set_config('request.jwt.claim.sub',other_id::text,true);
    rejected := false;
    begin perform public.decide_agent_proposal(proposal_id,'approve'); exception when others then rejected := true; end;
    perform pg_temp.assert(rejected,'Another owner must not approve');
    perform set_config('request.jwt.claim.sub',owner_id::text,true);
    result_id := public.decide_agent_proposal(proposal_id,'approve');
    perform pg_temp.assert(result_id is not null,'Approval must create/update a record');
    perform pg_temp.assert(public.decide_agent_proposal(proposal_id,'approve') is null,'Repeated approval must be idempotent');
    perform pg_temp.assert((select status='completed' from public.ai_runs where id=run_id),'Last approval must complete run');
  end loop;
  perform pg_temp.assert((select count(*)=1 from public.tasks where tasks.opportunity_id=agent_transactions.opportunity_id and created_by='agent'),'Exactly one Agent task');
  perform pg_temp.assert((select count(*)=1 from public.opportunity_notes where opportunity_notes.opportunity_id=agent_transactions.opportunity_id),'Exactly one Agent note');
  perform pg_temp.assert((select next_action='Prepare examples' from public.opportunities where id=opportunity_id),'Next Action applied');
  perform pg_temp.assert((select count(*)=3 from public.opportunity_events where opportunity_events.opportunity_id=agent_transactions.opportunity_id and actor='agent'),'Every Opportunity mutation records activity');

  insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
  values(owner_id,origin_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
  proposal := jsonb_set(proposal,'{tool}','"create_task"');
  proposal := jsonb_set(proposal,'{targetId}',to_jsonb(opportunity_id));
  reply := jsonb_build_object('message','Reject this.','proposals',jsonb_build_array(proposal));
  perform public.complete_agent_run(run_id,reply,null,null);
  select id into proposal_id from public.agent_proposals where agent_proposals.run_id=agent_transactions.run_id;
  perform public.decide_agent_proposal(proposal_id,'reject');
  perform pg_temp.assert((select status='completed' from public.ai_runs where id=run_id),'Rejection must complete run');
  perform pg_temp.assert((select count(*)=1 from public.tasks where tasks.opportunity_id=agent_transactions.opportunity_id and created_by='agent'),'Rejection must not mutate');

  insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
  values(owner_id,origin_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
  reply := jsonb_build_object('message','Invalid target.','proposals',jsonb_build_array(proposal,jsonb_set(proposal,'{targetId}',to_jsonb(gen_random_uuid()))));
  rejected := false;
  begin perform public.complete_agent_run(run_id,reply,null,null); exception when others then rejected := true; end;
  perform pg_temp.assert(rejected,'Invalid target must reject the whole result');
  perform pg_temp.assert(not exists(select 1 from public.agent_messages where agent_messages.run_id=agent_transactions.run_id),'Failed result must not leave a misleading answer');
  perform pg_temp.assert(not exists(select 1 from public.agent_proposals where agent_proposals.run_id=agent_transactions.run_id),'Failed result must not leave partial proposals');
end;
$$;
select pg_temp.assert(not has_function_privilege('authenticated','public.complete_agent_run(uuid,jsonb,integer,integer)','execute'),'Clients cannot forge provider results');
select pg_temp.assert(not has_function_privilege('anon','public.decide_agent_proposal(uuid,text)','execute'),'Anonymous callers cannot decide proposals');
rollback;
