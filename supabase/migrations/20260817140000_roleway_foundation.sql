create extension if not exists "pgcrypto";

create type public.job_inbox_state as enum ('new', 'maybe', 'dismissed', 'tracked');
create type public.opportunity_stage as enum ('inbox', 'interested', 'preparing', 'applied', 'interview', 'offer', 'closed');
create type public.task_status as enum ('todo', 'doing', 'done', 'cancelled');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  summary text not null default '',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_titles text[] not null default '{}',
  preferred_technologies text[] not null default '{}',
  remote_preference text not null default 'flexible' check (remote_preference in ('required', 'preferred', 'flexible')),
  allowed_locations text[] not null default '{}',
  minimum_compensation integer,
  currency text not null default 'USD',
  excluded_criteria text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(company) between 1 and 160),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  location text not null default '',
  compensation text not null default '',
  source text not null default 'Manual',
  source_url text,
  application_url text,
  remote_policy text not null default '',
  inbox_state public.job_inbox_state not null default 'new',
  date_posted date,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  reference_number bigint generated always as identity,
  stage public.opportunity_stage not null default 'interested',
  next_action text,
  next_action_due_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, job_id),
  check ((stage <> 'closed') or closed_reason is not null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  category text not null default 'admin',
  status public.task_status not null default 'todo',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  created_by text not null default 'user' check (created_by in ('user', 'agent', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  actor text not null default 'user' check (actor in ('user', 'agent', 'system')),
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  interview_type text not null,
  starts_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  meeting_url text,
  notes text not null default '',
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  kind text not null,
  title text not null check (char_length(title) between 1 and 180),
  status text not null default 'draft' check (status in ('draft', 'approved', 'submitted', 'archived')),
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index jobs_user_inbox_idx on public.jobs(user_id, inbox_state, imported_at desc);
create index opportunities_user_stage_idx on public.opportunities(user_id, stage, updated_at desc);
create index tasks_user_due_idx on public.tasks(user_id, status, due_at);
create index interviews_user_starts_idx on public.interviews(user_id, starts_at);
create index opportunity_events_timeline_idx on public.opportunity_events(opportunity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_updated_at before update on public.career_preferences for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger opportunities_updated_at before update on public.opportunities for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.opportunity_notes for each row execute function public.set_updated_at();
create trigger interviews_updated_at before update on public.interviews for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.career_preferences enable row level security;
alter table public.jobs enable row level security;
alter table public.opportunities enable row level security;
alter table public.tasks enable row level security;
alter table public.opportunity_notes enable row level security;
alter table public.opportunity_events enable row level security;
alter table public.interviews enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_owned" on public.profiles for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "preferences_owned" on public.career_preferences for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "jobs_owned" on public.jobs for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "opportunities_owned" on public.opportunities for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks_owned" on public.tasks for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes_owned" on public.opportunity_notes for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "events_owned" on public.opportunity_events for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "interviews_owned" on public.interviews for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "documents_owned" on public.documents for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notifications_owned" on public.notifications for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
