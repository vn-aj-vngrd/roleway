create table public.capture_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.capture_rate_limits enable row level security;

create or replace function public.consume_job_capture_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_window timestamptz;
  current_count integer;
begin
  if current_user_id is null then return false; end if;
  insert into public.capture_rate_limits (user_id, window_started_at, request_count)
  values (current_user_id, now(), 0)
  on conflict (user_id) do nothing;

  select window_started_at, request_count into current_window, current_count
  from public.capture_rate_limits
  where user_id = current_user_id
  for update;

  if current_window < now() - interval '1 hour' then
    update public.capture_rate_limits
    set window_started_at = now(), request_count = 1, updated_at = now()
    where user_id = current_user_id;
    return true;
  end if;
  if current_count >= 20 then return false; end if;

  update public.capture_rate_limits
  set request_count = request_count + 1, updated_at = now()
  where user_id = current_user_id;
  return true;
end;
$$;

revoke all on function public.consume_job_capture_quota() from public;
grant execute on function public.consume_job_capture_quota() to authenticated;
