-- Native Roleway Agent conversations, inspectable runs, and approval-gated internal tools.

create table public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null default 'New conversation' check (char_length(title) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_runs
  add column project_id uuid references public.search_projects(id) on delete restrict,
  add column conversation_id uuid references public.agent_conversations(id) on delete cascade;

update public.ai_runs r
set project_id = coalesce(
  (select o.project_id from public.opportunities o where o.id = r.opportunity_id),
  (select p.active_project_id from public.profiles p where p.user_id = r.user_id)
);

delete from public.ai_runs where project_id is null;
alter table public.ai_runs alter column project_id set not null;

alter table public.ai_runs drop constraint if exists ai_runs_task_type_check;
alter table public.ai_runs add constraint ai_runs_task_type_check
  check (task_type in ('next_actions', 'follow_up', 'interview', 'fit_review', 'conversation'));
alter table public.ai_runs drop constraint if exists ai_runs_status_check;
alter table public.ai_runs add constraint ai_runs_status_check
  check (status in ('queued', 'gathering_context', 'generating', 'awaiting_approval', 'completed', 'failed', 'cancelled'));

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  run_id uuid references public.ai_runs(id) on delete set null,
  role text not null check (role in ('user', 'agent')),
  content text not null check (char_length(content) between 1 and 30000),
  created_at timestamptz not null default now()
);

create table public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  run_id uuid not null references public.ai_runs(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  status text not null check (status in ('pending', 'active', 'completed', 'failed')),
  position smallint not null check (position between 0 and 100),
  created_at timestamptz not null default now(),
  unique(run_id, position)
);

create table public.agent_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  run_id uuid not null references public.ai_runs(id) on delete cascade,
  tool_name text not null check (tool_name in ('create_workspace', 'create_task', 'set_next_action', 'create_note')),
  target_type text not null check (target_type in ('account', 'workspace', 'opportunity')),
  target_id uuid,
  summary text not null check (char_length(summary) between 1 and 500),
  arguments jsonb not null default '{}',
  status text not null default 'proposed' check (status in ('proposed', 'applying', 'applied', 'rejected', 'failed', 'expired', 'superseded')),
  error_code text,
  decided_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agent_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guidance text not null default '' check (char_length(guidance) <= 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_conversations_project_updated_idx on public.agent_conversations(project_id, updated_at desc);
create index agent_messages_conversation_created_idx on public.agent_messages(conversation_id, created_at);
create index agent_run_steps_run_position_idx on public.agent_run_steps(run_id, position);
create index agent_proposals_conversation_status_idx on public.agent_proposals(conversation_id, status, created_at);
create index ai_runs_project_conversation_idx on public.ai_runs(project_id, conversation_id, created_at desc);

create trigger agent_conversations_updated_at before update on public.agent_conversations
  for each row execute function public.set_updated_at();
create trigger agent_preferences_updated_at before update on public.agent_preferences
  for each row execute function public.set_updated_at();

create or replace function public.assign_agent_conversation_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.project_id is null or not exists (
    select 1 from public.search_projects
    where id = new.project_id and user_id = new.user_id and status <> 'archived'
  ) then
    raise exception 'A valid active Workspace is required';
  end if;
  if new.opportunity_id is not null and not exists (
    select 1 from public.opportunities
    where id = new.opportunity_id and user_id = new.user_id and project_id = new.project_id
  ) then
    raise exception 'The focused Opportunity must belong to the same Workspace';
  end if;
  return new;
end;
$$;

create trigger agent_conversations_assign_project before insert or update of project_id, opportunity_id, user_id
  on public.agent_conversations for each row execute function public.assign_agent_conversation_project();

create or replace function public.assign_agent_child_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare derived_project_id uuid;
begin
  select project_id into derived_project_id
  from public.agent_conversations
  where id = new.conversation_id and user_id = new.user_id;
  if derived_project_id is null then raise exception 'The Agent conversation is not available'; end if;
  if new.project_id is not null and new.project_id <> derived_project_id then
    raise exception 'Agent records must belong to the conversation Workspace';
  end if;
  new.project_id := derived_project_id;
  return new;
end;
$$;

create trigger agent_messages_assign_project before insert or update of project_id, conversation_id, user_id
  on public.agent_messages for each row execute function public.assign_agent_child_project();
create trigger agent_run_steps_assign_project before insert or update of project_id, conversation_id, user_id
  on public.agent_run_steps for each row execute function public.assign_agent_child_project();
create trigger agent_proposals_assign_project before insert or update of project_id, conversation_id, user_id
  on public.agent_proposals for each row execute function public.assign_agent_child_project();

create or replace function public.validate_agent_run_scope()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare conversation_project_id uuid;
declare opportunity_project_id uuid;
begin
  if new.conversation_id is not null then
    select project_id into conversation_project_id from public.agent_conversations
    where id = new.conversation_id and user_id = new.user_id;
    if conversation_project_id is null then raise exception 'The Agent conversation is not available'; end if;
    if new.project_id <> conversation_project_id then raise exception 'Agent Run and conversation must share a Workspace'; end if;
  end if;
  if new.opportunity_id is not null then
    select project_id into opportunity_project_id from public.opportunities
    where id = new.opportunity_id and user_id = new.user_id;
    if opportunity_project_id is null or new.project_id <> opportunity_project_id then
      raise exception 'Agent Run and Opportunity must share a Workspace';
    end if;
  end if;
  if not exists (select 1 from public.search_projects where id = new.project_id and user_id = new.user_id) then
    raise exception 'The Agent Run Workspace is not available';
  end if;
  return new;
end;
$$;

create trigger ai_runs_validate_scope before insert or update of project_id, conversation_id, opportunity_id, user_id
  on public.ai_runs for each row execute function public.validate_agent_run_scope();

alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_run_steps enable row level security;
alter table public.agent_proposals enable row level security;
alter table public.agent_preferences enable row level security;

drop policy if exists "ai_runs_owned_select" on public.ai_runs;
create policy "ai_runs_owned_select" on public.ai_runs for select
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id));

create policy "agent_conversations_owned" on public.agent_conversations for all
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id))
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  );

create policy "agent_messages_owned" on public.agent_messages for all
  using (
    (select auth.uid()) = user_id and public.owns_search_project(project_id)
    and exists (select 1 from public.agent_conversations c where c.id = conversation_id and c.user_id = agent_messages.user_id and c.project_id = agent_messages.project_id)
  )
  with check (
    (select auth.uid()) = user_id and public.owns_search_project(project_id)
    and exists (select 1 from public.agent_conversations c where c.id = conversation_id and c.user_id = agent_messages.user_id and c.project_id = agent_messages.project_id)
  );

create policy "agent_run_steps_owned_select" on public.agent_run_steps for select
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id));
create policy "agent_proposals_owned_select" on public.agent_proposals for select
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id));
create policy "agent_preferences_owned" on public.agent_preferences for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.agent_conversations is 'Workspace-scoped Roleway Agent threads with explicit context boundaries.';
comment on table public.agent_proposals is 'Validated internal changes that require an explicit user decision before application.';
