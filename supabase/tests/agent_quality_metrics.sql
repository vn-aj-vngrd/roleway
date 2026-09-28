-- Authenticated summaries must stay account-scoped; global summaries require admin.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end;
$$;
do $$
declare owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  project_id uuid; conversation_id uuid; connection_id uuid; run_id uuid;
  blocked boolean := false;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_id,'quality-'||owner_id||'@roleway.test',now()),
    (other_id,'quality-'||other_id||'@roleway.test',now());
  select active_project_id into project_id from public.profiles where user_id=owner_id;
  insert into public.ai_connections(user_id,provider,label,model,encrypted_secret,secret_iv,key_hint,status)
    values(owner_id,'openrouter','Fixture','fixture-model','fixture','fixture','fixture','connected') returning id into connection_id;
  insert into public.agent_conversations(user_id,project_id,title)
    values(owner_id,project_id,'Quality fixture') returning id into conversation_id;
  insert into public.ai_runs(user_id,project_id,conversation_id,connection_id,task_type,provider,model,status,duration_ms,first_text_ms,error_code,cost_usd_micros)
    values(owner_id,project_id,conversation_id,connection_id,'conversation','openrouter','fixture-model','failed',1200,400,'provider_timeout',1500) returning id into run_id;
  insert into public.agent_messages(user_id,project_id,conversation_id,run_id,role,content,rating,rating_reason,rated_at)
    values(owner_id,project_id,conversation_id,run_id,'agent','Fixture reply','bad','incorrect',now());
  insert into public.agent_eval_runs(user_id,connection_id,provider,model,status,checks,duration_ms)
    values(owner_id,connection_id,'openrouter','fixture-model','failed','[{"id":"authorization","status":"failed","failureKind":"expectation"}]',1000);
  begin
    insert into public.agent_eval_runs(user_id,connection_id,provider,model,status,checks,duration_ms)
      values(other_id,connection_id,'openrouter','fixture-model','passed','[]',1000);
  exception when others then blocked := true; end;
  perform pg_temp.assert(blocked,'Evaluation must reject a connection owned by another account');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform pg_temp.assert((public.agent_health(false)->>'runs')::integer = 1,'Owner summary must include its run');
  perform pg_temp.assert((public.agent_health(false)->>'badRatings')::integer = 1,'Owner summary must include its rating');
  perform pg_temp.assert((public.agent_health(false)->>'evalRuns')::integer = 1,'Owner summary must include its eval');
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  perform pg_temp.assert((public.agent_health(false)->>'runs')::integer = 0,'Other account must not see owner runs');
  blocked := false;
  begin perform public.agent_health(true); exception when others then blocked := true; end;
  perform pg_temp.assert(blocked,'Non-admin must not request global Agent health');
  insert into public.admin_members(user_id,role) values(owner_id,'viewer');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform pg_temp.assert((public.agent_health(true)->>'runs')::integer = 1,'Admin global summary must include recorded runs');
end;
$$;
rollback;
