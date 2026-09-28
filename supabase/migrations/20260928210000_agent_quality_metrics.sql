-- Content-free Agent health signals and owner-controlled reply ratings.
alter table public.ai_runs
  add column duration_ms integer check (duration_ms >= 0),
  add column first_text_ms integer check (first_text_ms >= 0),
  add column error_code text check (error_code is null or char_length(error_code) <= 80),
  add column cost_usd_micros bigint check (cost_usd_micros >= 0);

alter table public.agent_messages
  add column rating text check (rating in ('good', 'bad')),
  add column rating_reason text check (rating_reason in ('incorrect', 'wrong_context', 'unsafe', 'unhelpful', 'other')),
  add column rated_at timestamptz,
  add constraint agent_message_rating_complete check (
    (rating is null and rating_reason is null and rated_at is null)
    or (role = 'agent' and rating is not null and rated_at is not null)
  );

create index ai_runs_health_created_idx on public.ai_runs(created_at desc)
  where task_type = 'conversation';
create index agent_messages_rated_idx on public.agent_messages(rated_at desc)
  where rating is not null;

create table public.agent_eval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.ai_connections(id) on delete set null,
  provider text not null,
  model text not null,
  status text not null check (status in ('passed', 'failed')),
  checks jsonb not null check (jsonb_typeof(checks) = 'array'),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  cost_usd_micros bigint check (cost_usd_micros >= 0),
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);
create index agent_eval_runs_user_created_idx on public.agent_eval_runs(user_id, created_at desc);
create index agent_eval_runs_created_idx on public.agent_eval_runs(created_at desc);
alter table public.agent_eval_runs enable row level security;
create or replace function public.validate_agent_eval_scope()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.connection_id is not null and not exists (
    select 1 from public.ai_connections c where c.id = new.connection_id and c.user_id = new.user_id
  ) then raise exception 'Agent evaluation connection does not belong to account'; end if;
  return new;
end;
$$;
create trigger agent_eval_runs_validate_scope before insert or update of user_id, connection_id
  on public.agent_eval_runs for each row execute function public.validate_agent_eval_scope();
create policy agent_eval_runs_owned_select on public.agent_eval_runs for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.agent_eval_runs to authenticated;

create or replace function public.agent_health(input_global boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or (input_global and not public.is_roleway_admin()) then
    raise exception 'not authorized';
  end if;
  with runs as materialized (
    select provider, model, connection_id, status, duration_ms, first_text_ms,
           input_tokens, output_tokens, cost_usd_micros, error_code, created_at
    from public.ai_runs
    where task_type = 'conversation' and created_at >= now() - interval '30 days'
      and (input_global or user_id = auth.uid())
  ), ratings as materialized (
    select rating, rating_reason from public.agent_messages
    where rated_at >= now() - interval '30 days'
      and (input_global or user_id = auth.uid())
  ), evals as materialized (
    select provider, model, connection_id, status, checks, input_tokens, output_tokens, cost_usd_micros, created_at from public.agent_eval_runs
    where created_at >= now() - interval '30 days'
      and (input_global or user_id = auth.uid())
  )
  select jsonb_build_object(
    'runs', (select count(*) from runs),
    'failed', (select count(*) from runs where status = 'failed'),
    'averageDurationMs', (select round(avg(duration_ms)) from runs),
    'p95DurationMs', (select round(percentile_cont(0.95) within group (order by duration_ms)) from runs),
    'averageFirstTextMs', (select round(avg(first_text_ms)) from runs),
    'inputTokens', (select coalesce(sum(input_tokens), 0) from runs),
    'outputTokens', (select coalesce(sum(output_tokens), 0) from runs),
    'reportedCostMicros', (select coalesce(sum(cost_usd_micros), 0) from runs),
    'costCoverage', (select count(cost_usd_micros) from runs),
    'goodRatings', (select count(*) from ratings where rating = 'good'),
    'badRatings', (select count(*) from ratings where rating = 'bad'),
    'evalRuns', (select count(*) from evals),
    'evalPassed', (select count(*) from evals where status = 'passed'),
    'evalInputTokens', (select coalesce(sum(input_tokens), 0) from evals),
    'evalOutputTokens', (select coalesce(sum(output_tokens), 0) from evals),
    'evalReportedCostMicros', (select coalesce(sum(cost_usd_micros), 0) from evals),
    'evalCostCoverage', (select count(cost_usd_micros) from evals),
    'evalChecks', (select coalesce(jsonb_agg(jsonb_build_object('check', check_name, 'passed', passed, 'total', total)), '[]'::jsonb) from
      (select item->>'id' check_name, count(*) filter (where item->>'status' = 'passed') passed, count(*) total
       from evals, jsonb_array_elements(checks) item group by 1 order by 1) ec),
    'evalFailureKinds', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'count', total)), '[]'::jsonb) from
      (select item->>'failureKind' kind, count(*) total from evals, jsonb_array_elements(checks) item
       where item->>'status' = 'failed' group by 1 order by count(*) desc, 1) ef),
    'recentEvals', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'model', model, 'status', status, 'createdAt', created_at,
      'connectionLabel', case when input_global then null else (select c.label from public.ai_connections c where c.id = connection_id) end)), '[]'::jsonb) from
      (select provider, model, status, created_at, connection_id from evals order by created_at desc limit 8) er),
    'errors', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'count', total)), '[]'::jsonb) from
      (select coalesce(error_code, 'unclassified') code, count(*) total from runs
       where status = 'failed' group by 1 order by count(*) desc, 1 limit 8) e),
    'badReasons', (select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'count', total)), '[]'::jsonb) from
      (select coalesce(rating_reason, 'unspecified') reason, count(*) total from ratings
       where rating = 'bad' group by 1 order by count(*) desc, 1 limit 8) r),
    'models', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'model', model,
      'connectionId', connection_id,
      'connectionLabel', case when input_global then null else
        (select c.label from public.ai_connections c where c.id = connection_id) end,
      'runs', total, 'failed', failed, 'averageDurationMs', average_duration_ms,
      'inputTokens', input_tokens, 'outputTokens', output_tokens,
      'reportedCostMicros', reported_cost_micros, 'costCoverage', cost_coverage)), '[]'::jsonb) from
      (select provider, model, case when input_global then null else connection_id end connection_id,
        count(*) total, count(*) filter (where status = 'failed') failed,
        round(avg(duration_ms)) average_duration_ms,
        coalesce(sum(input_tokens), 0) input_tokens, coalesce(sum(output_tokens), 0) output_tokens,
        coalesce(sum(cost_usd_micros), 0) reported_cost_micros, count(cost_usd_micros) cost_coverage
       from runs group by provider, model, case when input_global then null else connection_id end
       order by count(*) desc, provider, model limit 20) m),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', activity_day, 'runs', total, 'failed', failed)), '[]'::jsonb) from
      (select created_at::date as activity_day, count(*) total, count(*) filter (where status = 'failed') failed
       from runs group by 1 order by 1) d)
  ) into result;
  return result;
end;
$$;

revoke all on function public.agent_health(boolean) from public, anon;
grant execute on function public.agent_health(boolean) to authenticated;
