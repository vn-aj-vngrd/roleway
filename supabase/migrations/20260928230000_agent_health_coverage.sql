-- Recover elapsed time from the first saved answer or failure event for runs
-- recorded before duration_ms existed. First text and provider charges have no
-- durable historical source and remain unknown.
with terminal_events as (
  select r.id, r.created_at,
    case
      when r.status in ('completed', 'awaiting_approval') then (
        select min(m.created_at) from public.agent_messages m
        where m.run_id = r.id and m.role = 'agent'
      )
      when r.status = 'failed' then (
        select max(s.created_at) from public.agent_run_steps s
        where s.run_id = r.id and s.status = 'failed'
      )
    end as ended_at
  from public.ai_runs r
  where r.task_type = 'conversation' and r.duration_ms is null
)
update public.ai_runs r
set duration_ms = round(extract(epoch from (e.ended_at - e.created_at)) * 1000)::integer
from terminal_events e
where r.id = e.id
  and e.ended_at >= e.created_at
  and e.ended_at < e.created_at + interval '24 hours';

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
    'durationCoverage', (select count(duration_ms) from runs),
    'p95DurationMs', (select round(percentile_cont(0.95) within group (order by duration_ms)) from runs),
    'averageFirstTextMs', (select round(avg(first_text_ms)) from runs),
    'firstTextCoverage', (select count(first_text_ms) from runs),
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
