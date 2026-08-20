create table public.ai_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'openrouter', 'openai-compatible')),
  label text not null check (char_length(label) between 1 and 80),
  model text not null check (char_length(model) between 1 and 160),
  base_url text,
  encrypted_secret text not null,
  secret_iv text not null,
  key_hint text not null,
  status text not null default 'untested' check (status in ('untested', 'connected', 'error')),
  last_error text,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.ai_connections(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  task_type text not null check (task_type in ('next_actions', 'follow_up', 'interview', 'fit_review')),
  provider text not null,
  model text not null,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  output jsonb,
  error_message text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ai_connections_user_idx on public.ai_connections(user_id, updated_at desc);
create index ai_runs_user_idx on public.ai_runs(user_id, created_at desc);

alter table public.ai_connections enable row level security;
alter table public.ai_runs enable row level security;

-- Connection secrets are intentionally inaccessible through the browser-facing database role.
-- Authenticated server actions use the service role after verifying the current user.
create policy "ai_runs_owned_select" on public.ai_runs for select using ((select auth.uid()) = user_id);

create trigger ai_connections_updated_at before update on public.ai_connections
  for each row execute function public.set_updated_at();
