-- New record types must remain proposals until an authenticated owner approves.
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',label; end if; end $$;
do $test$
<<test>>
declare owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); workspace_id uuid; other_workspace uuid;
  job_id uuid; opportunity_id uuid; conversation_id uuid; scoped_conversation uuid; run_id uuid; proposal_id uuid; result_id uuid;
  proposed jsonb; reply jsonb; tool text; rejected boolean; initial_count integer;
begin
  insert into auth.users(id,email,email_confirmed_at) values(owner_id,'e2e-'||owner_id||'@roleway.test',now()),(other_id,'e2e-'||other_id||'@roleway.test',now());
  insert into public.account_plans(user_id,plan_slug,expires_at) values(owner_id,'pro',now()+interval '1 day') on conflict(user_id) do update set plan_slug=excluded.plan_slug,expires_at=excluded.expires_at;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select active_project_id into workspace_id from public.profiles where user_id=owner_id;
  select active_project_id into other_workspace from public.profiles where user_id=other_id;
  insert into public.jobs(user_id,project_id,company,title) values(owner_id,workspace_id,'Fixture','Engineer') returning id into job_id;
  insert into public.opportunities(user_id,project_id,job_id,stage) values(owner_id,workspace_id,job_id,'applied') returning id into opportunity_id;
  insert into public.agent_conversations(user_id,project_id,title) values(owner_id,workspace_id,'Create records') returning id into conversation_id;
  foreach tool in array array['create_interview','create_contact'] loop
    proposed:=jsonb_build_object('tool',tool,'summary','Review record','targetId',opportunity_id,'workspaceId',workspace_id,
      'interview',jsonb_build_object('interviewType','Technical','startsAt','2027-01-15T14:00:00+08:00','durationMinutes',60,'timezone','Asia/Manila','meetingUrl','https://example.com/meeting','interviewers','Hiring team'),
      'contact',jsonb_build_object('name','Jane Recruiter','relationship','recruiter','email','jane@example.com','company','Fixture','followUpAt','2027-01-14T06:00:00Z'));
    insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
    values(owner_id,workspace_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
    perform public.complete_agent_run(run_id,jsonb_build_object('message','Review','proposals',jsonb_build_array(proposed)),1,1);
    select id into proposal_id from public.agent_proposals where agent_proposals.run_id=test.run_id;
    perform pg_temp.assert((select count(*)=0 from public.interviews where user_id=owner_id) or tool='create_contact','Generation must not schedule');
    perform pg_temp.assert((select count(*)=0 from public.contacts where user_id=owner_id),'Generation must not create contact');
    perform set_config('request.jwt.claim.sub',other_id::text,true);
    rejected:=false;
    begin perform public.decide_agent_proposal(proposal_id,'approve'); exception when others then rejected:=true; end;
    perform pg_temp.assert(rejected,'Other owner cannot approve');
    perform set_config('request.jwt.claim.sub',owner_id::text,true);
    result_id:=public.decide_agent_proposal(proposal_id,'approve');
    perform pg_temp.assert(result_id is not null,'Approval returns created record');
    perform pg_temp.assert((select applied_record_id=result_id and destination_project_id=workspace_id from public.agent_proposals where id=proposal_id),'Store result and destination');
    perform pg_temp.assert(public.decide_agent_proposal(proposal_id,'approve') is null,'Repeated approval is idempotent');
    -- Another proposal for the same record is rejected without a second write.
    insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
    values(owner_id,workspace_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
    perform public.complete_agent_run(run_id,jsonb_build_object('message','Duplicate','proposals',jsonb_build_array(proposed)),1,1);
    select id into proposal_id from public.agent_proposals where agent_proposals.run_id=test.run_id;
    rejected:=false;
    begin perform public.decide_agent_proposal(proposal_id,'approve'); exception when others then rejected:=true; end;
    perform pg_temp.assert(rejected,'Duplicate record must fail');
    perform pg_temp.assert((select status='proposed' from public.agent_proposals where id=proposal_id),'Failed approval rolls back');
    perform public.decide_agent_proposal(proposal_id,'reject');
  end loop;
  perform pg_temp.assert((select count(*)=1 from public.interviews where user_id=owner_id),'Exactly one interview');
  perform pg_temp.assert((select count(*)=1 from public.contacts where user_id=owner_id),'Exactly one linked contact');
  perform pg_temp.assert((select stage='interview' from public.opportunities where id=opportunity_id),'Scheduling preserves stage transition');
  perform pg_temp.assert((select count(*)=1 from public.tasks where tasks.opportunity_id=test.opportunity_id and category='interview'),'Scheduling preserves preparation task');
  perform pg_temp.assert((select starts_at='2027-01-15T06:00:00Z'::timestamptz and timezone='Asia/Manila' from public.interviews where user_id=owner_id),'Timezone instant preserved');

  -- A Workspace contact needs no Opportunity, but cannot cross owner/scope boundaries.
  proposed:=jsonb_set(proposed,'{targetId}','null');
  proposed:=jsonb_set(proposed,'{contact,name}','"Alex Network"');
  proposed:=jsonb_set(proposed,'{contact,email}','"alex@example.com"');
  insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
  values(owner_id,workspace_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
  reply:=jsonb_build_object('message','Workspace contact','proposals',jsonb_build_array(proposed));
  perform public.complete_agent_run(run_id,reply,1,1);
  select id into proposal_id from public.agent_proposals where agent_proposals.run_id=test.run_id;
  result_id:=public.decide_agent_proposal(proposal_id,'approve');
  perform pg_temp.assert((select c.opportunity_id is null and c.project_id=workspace_id from public.contacts c where id=result_id),'Standalone contact destination');

  -- Fixed conversation scope cannot be expanded to another owned Workspace.
  insert into public.search_projects(user_id,name) values(owner_id,'Other owned search') returning id into scoped_conversation;
  insert into public.agent_conversations(user_id,project_id,title,scope_mode) values(owner_id,workspace_id,'Scoped','workspace') returning id into conversation_id;
  insert into public.ai_runs(user_id,project_id,conversation_id,task_type,provider,model,status)
  values(owner_id,workspace_id,conversation_id,'conversation','openai','fixture','generating') returning id into run_id;
  rejected:=false;
  begin perform public.complete_agent_run(run_id,jsonb_build_object('message','Wrong scope','proposals',jsonb_build_array(jsonb_set(proposed,'{workspaceId}',to_jsonb(scoped_conversation)))),1,1); exception when others then rejected:=true; end;
  perform pg_temp.assert(rejected,'Owned Workspace outside conversation scope must be rejected');
  rejected:=false;
  begin perform public.complete_agent_run(run_id,jsonb_build_object('message','Bad owner','proposals',jsonb_build_array(jsonb_set(proposed,'{workspaceId}',to_jsonb(other_workspace)))),1,1); exception when others then rejected:=true; end;
  perform pg_temp.assert(rejected,'Foreign Workspace must be rejected before proposal storage');
  rejected:=false;
  begin perform public.complete_agent_run(run_id,jsonb_build_object('message','Bad URL','proposals',jsonb_build_array(jsonb_set(proposed,'{contact,profileUrl}','"javascript:alert(1)"'))),1,1); exception when others then rejected:=true; end;
  perform pg_temp.assert(rejected,'Unsafe URL must be rejected');
  rejected:=false;
  begin perform public.complete_agent_run(run_id,jsonb_build_object('message','Ambiguous time','proposals',jsonb_build_array(jsonb_build_object('tool','create_interview','summary','Bad time','targetId',opportunity_id,'interview',jsonb_build_object('interviewType','Technical','startsAt','2027-01-15T14:00:00','timezone','Asia/Manila','durationMinutes',60)))),1,1); exception when others then rejected:=true; end;
  perform pg_temp.assert(rejected,'Interview time must include an offset');
end;
$test$;
rollback;
