-- Search Projects turn a single global tracker into separate, intentional career searches.
create table public.search_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  objective text not null default '' check (char_length(objective) <= 500),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  target_titles text[] not null default '{}',
  industries text[] not null default '{}',
  preferred_technologies text[] not null default '{}',
  employment_types text[] not null default '{}',
  locations text[] not null default '{}',
  remote_preference text not null default 'flexible' check (remote_preference in ('required', 'preferred', 'flexible')),
  minimum_compensation integer check (minimum_compensation is null or minimum_compensation >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  seniority text[] not null default '{}',
  company_sizes text[] not null default '{}',
  deal_breakers text[] not null default '{}',
  preferred_companies text[] not null default '{}',
  excluded_companies text[] not null default '{}',
  search_keywords text[] not null default '{}',
  weekly_application_goal integer not null default 5 check (weekly_application_goal between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index search_projects_user_status_idx on public.search_projects(user_id, status, updated_at desc);
create unique index search_projects_user_name_uidx on public.search_projects(user_id, lower(name)) where status <> 'archived';
create trigger search_projects_updated_at before update on public.search_projects
  for each row execute function public.set_updated_at();

alter table public.search_projects enable row level security;
create policy "search_projects_owned" on public.search_projects
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.owns_search_project(input_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.search_projects
    where id = input_project_id and user_id = auth.uid()
  );
$$;

grant execute on function public.owns_search_project(uuid) to authenticated;

-- Existing accounts receive one project populated from their current preferences.
insert into public.search_projects (
  user_id, name, objective, target_titles, preferred_technologies, locations,
  remote_preference, minimum_compensation, currency, deal_breakers
)
select
  p.user_id,
  case
    when coalesce(cp.target_titles[1], '') <> '' then left(cp.target_titles[1] || ' search', 100)
    else 'Primary search'
  end,
  case
    when coalesce(cp.target_titles[1], '') <> '' then 'Find the right next ' || cp.target_titles[1] || ' opportunity'
    else 'Run a focused search for the right next role'
  end,
  coalesce(cp.target_titles, '{}'),
  coalesce(cp.preferred_technologies, '{}'),
  coalesce(cp.allowed_locations, '{}'),
  coalesce(cp.remote_preference, 'flexible'),
  cp.minimum_compensation,
  coalesce(cp.currency, 'USD'),
  coalesce(cp.excluded_criteria, '{}')
from public.profiles p
left join public.career_preferences cp on cp.user_id = p.user_id;

alter table public.profiles
  add column active_project_id uuid references public.search_projects(id) on delete set null;

update public.profiles p
set active_project_id = (
  select sp.id
  from public.search_projects sp
  where sp.user_id = p.user_id
  order by sp.created_at
  limit 1
);

alter table public.jobs add column project_id uuid references public.search_projects(id) on delete restrict;
update public.jobs j set project_id = p.active_project_id from public.profiles p where p.user_id = j.user_id;
alter table public.jobs alter column project_id set not null;

alter table public.opportunities
  add column project_id uuid references public.search_projects(id) on delete restrict,
  add column priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  add column excitement smallint check (excitement is null or excitement between 1 and 5),
  add column deadline date;
update public.opportunities o set project_id = j.project_id from public.jobs j where j.id = o.job_id;
alter table public.opportunities alter column project_id set not null;

alter table public.tasks add column project_id uuid references public.search_projects(id) on delete restrict;
update public.tasks t
set project_id = coalesce(
  (select o.project_id from public.opportunities o where o.id = t.opportunity_id),
  (select p.active_project_id from public.profiles p where p.user_id = t.user_id)
);
alter table public.tasks alter column project_id set not null;

alter table public.interviews
  add column project_id uuid references public.search_projects(id) on delete restrict,
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  add column interviewers text not null default '' check (char_length(interviewers) <= 2000),
  add column preparation_notes text not null default '' check (char_length(preparation_notes) <= 30000),
  add column questions_to_ask text not null default '' check (char_length(questions_to_ask) <= 30000),
  add column status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled'));
update public.interviews i set project_id = o.project_id from public.opportunities o where o.id = i.opportunity_id;
alter table public.interviews alter column project_id set not null;

alter table public.documents add column project_id uuid references public.search_projects(id) on delete restrict;
update public.documents d
set project_id = coalesce(
  (select o.project_id from public.opportunities o where o.id = d.opportunity_id),
  (select p.active_project_id from public.profiles p where p.user_id = d.user_id)
);
alter table public.documents alter column project_id set not null;

alter table public.notifications add column project_id uuid references public.search_projects(id) on delete cascade;
update public.notifications n set project_id = p.active_project_id from public.profiles p where p.user_id = n.user_id;

create index jobs_project_inbox_idx on public.jobs(project_id, inbox_state, imported_at desc);
create index opportunities_project_stage_idx on public.opportunities(project_id, stage, priority, updated_at desc);
create index tasks_project_due_idx on public.tasks(project_id, status, due_at);
create index interviews_project_starts_idx on public.interviews(project_id, starts_at);
create index documents_project_updated_idx on public.documents(project_id, updated_at desc);
create index notifications_project_read_idx on public.notifications(project_id, read_at, created_at desc);
create unique index jobs_project_source_url_uidx on public.jobs(user_id, project_id, source_url) where source_url is not null;

create or replace function public.opportunity_belongs_to_project(input_opportunity_id uuid, input_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opportunities
    where id = input_opportunity_id
      and project_id = input_project_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.opportunity_belongs_to_project(uuid, uuid) to authenticated;

create or replace function public.assign_job_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.project_id is null then
    select active_project_id into new.project_id
    from public.profiles where user_id = new.user_id;
  end if;
  if new.project_id is null or not exists (
    select 1 from public.search_projects where id = new.project_id and user_id = new.user_id and status <> 'archived'
  ) then
    raise exception 'A valid active Search Project is required';
  end if;
  return new;
end;
$$;

create trigger jobs_assign_project before insert or update of project_id, user_id on public.jobs
  for each row execute function public.assign_job_project();

create or replace function public.assign_opportunity_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare derived_project_id uuid;
begin
  select project_id into derived_project_id
  from public.jobs where id = new.job_id and user_id = new.user_id;
  if derived_project_id is null then raise exception 'The linked Job is not available'; end if;
  if new.project_id is not null and new.project_id <> derived_project_id then
    raise exception 'Opportunity and Job must belong to the same Search Project';
  end if;
  new.project_id := derived_project_id;
  return new;
end;
$$;

create trigger opportunities_assign_project before insert or update of project_id, job_id, user_id on public.opportunities
  for each row execute function public.assign_opportunity_project();

create or replace function public.assign_child_project()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare derived_project_id uuid;
begin
  if new.opportunity_id is not null then
    select project_id into derived_project_id
    from public.opportunities where id = new.opportunity_id and user_id = new.user_id;
  else
    select active_project_id into derived_project_id
    from public.profiles where user_id = new.user_id;
  end if;
  if derived_project_id is null then raise exception 'A valid Search Project is required'; end if;
  if new.project_id is not null and new.project_id <> derived_project_id then
    raise exception 'Related records must belong to the same Search Project';
  end if;
  new.project_id := derived_project_id;
  return new;
end;
$$;

create trigger tasks_assign_project before insert or update of project_id, opportunity_id, user_id on public.tasks
  for each row execute function public.assign_child_project();
create trigger interviews_assign_project before insert or update of project_id, opportunity_id, user_id on public.interviews
  for each row execute function public.assign_child_project();
create trigger documents_assign_project before insert or update of project_id, opportunity_id, user_id on public.documents
  for each row execute function public.assign_child_project();

-- Rebuild owner policies so project ownership and relationship integrity agree.
drop policy if exists "jobs_owned" on public.jobs;
create policy "jobs_owned" on public.jobs for all
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id))
  with check ((select auth.uid()) = user_id and public.owns_search_project(project_id));

drop policy if exists "opportunities_owned" on public.opportunities;
create policy "opportunities_owned" on public.opportunities for all
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id))
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and public.owns_job(job_id)
    and exists (select 1 from public.jobs where id = job_id and project_id = opportunities.project_id)
  );

drop policy if exists "tasks_owned" on public.tasks;
create policy "tasks_owned" on public.tasks for all
  using (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  );

drop policy if exists "interviews_owned" on public.interviews;
create policy "interviews_owned" on public.interviews for all
  using (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and public.opportunity_belongs_to_project(opportunity_id, project_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and public.opportunity_belongs_to_project(opportunity_id, project_id)
  );

drop policy if exists "documents_owned" on public.documents;
create policy "documents_owned" on public.documents for all
  using (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  );

drop policy if exists "notifications_owned" on public.notifications;
create policy "notifications_owned" on public.notifications for all
  using ((select auth.uid()) = user_id and (project_id is null or public.owns_search_project(project_id)))
  with check ((select auth.uid()) = user_id and (project_id is null or public.owns_search_project(project_id)));

-- A structured submission record preserves exactly what was used for an application.
create table public.application_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  opportunity_id uuid not null unique references public.opportunities(id) on delete cascade,
  submitted_at timestamptz not null,
  channel text not null default 'company_site' check (channel in ('company_site', 'job_board', 'email', 'referral', 'other')),
  confirmation_reference text not null default '' check (char_length(confirmation_reference) <= 500),
  resume_document_id uuid references public.documents(id) on delete set null,
  cover_letter_document_id uuid references public.documents(id) on delete set null,
  portfolio_url text,
  salary_expectation text not null default '' check (char_length(salary_expectation) <= 500),
  notes text not null default '' check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_records_project_submitted_idx on public.application_records(project_id, submitted_at desc);
create trigger application_records_updated_at before update on public.application_records
  for each row execute function public.set_updated_at();
create trigger application_records_assign_project before insert or update of project_id, opportunity_id, user_id on public.application_records
  for each row execute function public.assign_child_project();
alter table public.application_records enable row level security;
create policy "application_records_owned" on public.application_records for all
  using (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and public.opportunity_belongs_to_project(opportunity_id, project_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and public.opportunity_belongs_to_project(opportunity_id, project_id)
    and (resume_document_id is null or exists (select 1 from public.documents d where d.id = resume_document_id and d.user_id = application_records.user_id and d.project_id = application_records.project_id))
    and (cover_letter_document_id is null or exists (select 1 from public.documents d where d.id = cover_letter_document_id and d.user_id = application_records.user_id and d.project_id = application_records.project_id))
  );

-- Contacts stay lightweight and subordinate to a Search Project or Opportunity.
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  role text not null default '' check (char_length(role) <= 180),
  company text not null default '' check (char_length(company) <= 160),
  relationship text not null default 'contact' check (relationship in ('recruiter', 'hiring_manager', 'interviewer', 'referral', 'colleague', 'contact')),
  email text,
  phone text,
  profile_url text,
  notes text not null default '' check (char_length(notes) <= 20000),
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_project_name_idx on public.contacts(project_id, name);
create index contacts_project_follow_up_idx on public.contacts(project_id, follow_up_at) where follow_up_at is not null;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger contacts_assign_project before insert or update of project_id, opportunity_id, user_id on public.contacts
  for each row execute function public.assign_child_project();
alter table public.contacts enable row level security;
create policy "contacts_owned" on public.contacts for all
  using (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_search_project(project_id)
    and (opportunity_id is null or public.opportunity_belongs_to_project(opportunity_id, project_id))
  );

-- Document versions are append-only snapshots created whenever a document is saved.
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.search_projects(id) on delete restrict,
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  status text not null,
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(document_id, version)
);

create index document_versions_document_idx on public.document_versions(document_id, version desc);
alter table public.document_versions enable row level security;
create policy "document_versions_owned_select" on public.document_versions for select
  using ((select auth.uid()) = user_id and public.owns_search_project(project_id));

create or replace function public.capture_document_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_version integer;
begin
  if tg_op = 'UPDATE' and new.title is not distinct from old.title and new.status is not distinct from old.status and new.content is not distinct from old.content then
    return new;
  end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.document_versions where document_id = new.id;
  insert into public.document_versions (user_id, project_id, document_id, version, title, status, content)
  values (new.user_id, new.project_id, new.id, next_version, new.title, new.status, new.content);
  return new;
end;
$$;

create trigger documents_capture_version after insert or update of title, status, content on public.documents
  for each row execute function public.capture_document_version();

insert into public.document_versions (user_id, project_id, document_id, version, title, status, content)
select user_id, project_id, id, 1, title, status, content from public.documents
on conflict (document_id, version) do nothing;

-- Tracking preserves the Job's project and remains idempotent.
create or replace function public.track_job(input_job_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tracked_opportunity_id uuid;
  job_project_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select project_id into job_project_id
  from public.jobs where id = input_job_id and user_id = current_user_id;
  if job_project_id is null then raise exception 'Job not found'; end if;

  insert into public.opportunities (user_id, project_id, job_id, stage, next_action)
  values (current_user_id, job_project_id, input_job_id, 'interested', 'Review requirements and decide whether to prepare')
  on conflict (user_id, job_id) do update set updated_at = now()
  returning id into tracked_opportunity_id;

  update public.jobs set inbox_state = 'tracked' where id = input_job_id and user_id = current_user_id;

  if not exists (
    select 1 from public.opportunity_events e
    where e.opportunity_id = tracked_opportunity_id and e.event_type = 'opportunity_created'
  ) then
    insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
    values (current_user_id, tracked_opportunity_id, 'user', 'opportunity_created', jsonb_build_object('job_id', input_job_id, 'project_id', job_project_id));
  end if;

  return tracked_opportunity_id;
end;
$$;

grant execute on function public.track_job(uuid) to authenticated;

create or replace function public.submit_application(
  input_opportunity_id uuid,
  input_submitted_at timestamptz,
  input_channel text,
  input_confirmation_reference text default '',
  input_resume_document_id uuid default null,
  input_cover_letter_document_id uuid default null,
  input_portfolio_url text default null,
  input_salary_expectation text default '',
  input_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  opportunity_project_id uuid;
  previous_stage public.opportunity_stage;
  application_id uuid;
  was_submitted boolean;
  follow_up_at timestamptz := input_submitted_at + interval '7 days';
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if input_channel not in ('company_site', 'job_board', 'email', 'referral', 'other') then
    raise exception 'Invalid application channel';
  end if;

  select project_id, stage into opportunity_project_id, previous_stage
  from public.opportunities
  where id = input_opportunity_id and user_id = current_user_id
  for update;
  if opportunity_project_id is null then raise exception 'Opportunity not found'; end if;

  if input_resume_document_id is not null and not exists (
    select 1 from public.documents
    where id = input_resume_document_id and user_id = current_user_id and project_id = opportunity_project_id
  ) then raise exception 'Resume document not found'; end if;
  if input_cover_letter_document_id is not null and not exists (
    select 1 from public.documents
    where id = input_cover_letter_document_id and user_id = current_user_id and project_id = opportunity_project_id
  ) then raise exception 'Cover letter document not found'; end if;

  select exists (
    select 1 from public.application_records where opportunity_id = input_opportunity_id
  ) into was_submitted;

  insert into public.application_records (
    user_id, project_id, opportunity_id, submitted_at, channel, confirmation_reference,
    resume_document_id, cover_letter_document_id, portfolio_url, salary_expectation, notes
  ) values (
    current_user_id, opportunity_project_id, input_opportunity_id, input_submitted_at, input_channel,
    trim(coalesce(input_confirmation_reference, '')), input_resume_document_id, input_cover_letter_document_id,
    nullif(trim(coalesce(input_portfolio_url, '')), ''), trim(coalesce(input_salary_expectation, '')),
    trim(coalesce(input_notes, ''))
  ) on conflict (opportunity_id) do update set
    submitted_at = excluded.submitted_at,
    channel = excluded.channel,
    confirmation_reference = excluded.confirmation_reference,
    resume_document_id = excluded.resume_document_id,
    cover_letter_document_id = excluded.cover_letter_document_id,
    portfolio_url = excluded.portfolio_url,
    salary_expectation = excluded.salary_expectation,
    notes = excluded.notes
  returning id into application_id;

  update public.opportunities set
    stage = 'applied',
    closed_reason = null,
    next_action = 'Follow up on the application',
    next_action_due_at = follow_up_at
  where id = input_opportunity_id and user_id = current_user_id;

  if previous_stage <> 'applied' then
    insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
    values (current_user_id, input_opportunity_id, 'user', 'stage_changed', jsonb_build_object('from', previous_stage, 'to', 'applied'));
  end if;

  insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
  values (
    current_user_id,
    input_opportunity_id,
    'user',
    case when was_submitted then 'application_updated' else 'application_submitted' end,
    jsonb_build_object('submitted_at', input_submitted_at, 'channel', input_channel, 'application_id', application_id)
  );

  if not exists (
    select 1 from public.tasks
    where opportunity_id = input_opportunity_id
      and status not in ('done', 'cancelled')
      and category = 'follow-up'
  ) then
    insert into public.tasks (user_id, project_id, opportunity_id, title, category, due_at, created_by)
    values (current_user_id, opportunity_project_id, input_opportunity_id, 'Follow up on the application', 'follow-up', follow_up_at, 'system');
  end if;

  return application_id;
end;
$$;

grant execute on function public.submit_application(uuid, timestamptz, text, text, uuid, uuid, text, text, text) to authenticated;

create or replace function public.schedule_interview(
  input_opportunity_id uuid,
  input_interview_type text,
  input_starts_at timestamptz,
  input_duration_minutes integer,
  input_meeting_url text default null,
  input_timezone text default 'UTC',
  input_interviewers text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  opportunity_project_id uuid;
  previous_stage public.opportunity_stage;
  interview_id uuid;
  preparation_due_at timestamptz;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(input_interview_type)) < 1 then raise exception 'Interview type is required'; end if;
  if input_duration_minutes < 5 or input_duration_minutes > 1440 then raise exception 'Invalid interview duration'; end if;

  select project_id, stage into opportunity_project_id, previous_stage
  from public.opportunities
  where id = input_opportunity_id and user_id = current_user_id
  for update;
  if opportunity_project_id is null then raise exception 'Opportunity not found'; end if;

  insert into public.interviews (
    user_id, project_id, opportunity_id, interview_type, starts_at, duration_minutes,
    meeting_url, timezone, interviewers
  ) values (
    current_user_id, opportunity_project_id, input_opportunity_id, trim(input_interview_type),
    input_starts_at, input_duration_minutes, nullif(trim(coalesce(input_meeting_url, '')), ''),
    trim(input_timezone), trim(coalesce(input_interviewers, ''))
  ) returning id into interview_id;

  if previous_stage not in ('offer', 'closed') and previous_stage <> 'interview' then
    update public.opportunities set stage = 'interview', closed_reason = null where id = input_opportunity_id;
    insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
    values (current_user_id, input_opportunity_id, 'system', 'stage_changed', jsonb_build_object('from', previous_stage, 'to', 'interview', 'reason', 'interview_scheduled'));
  end if;

  insert into public.opportunity_events (user_id, opportunity_id, actor, event_type, payload)
  values (current_user_id, input_opportunity_id, 'user', 'interview_scheduled', jsonb_build_object('interview_id', interview_id, 'type', trim(input_interview_type), 'starts_at', input_starts_at));

  preparation_due_at := greatest(now(), input_starts_at - interval '1 day');
  if not exists (
    select 1 from public.tasks
    where opportunity_id = input_opportunity_id
      and status not in ('done', 'cancelled')
      and category = 'interview'
      and title = 'Prepare for ' || trim(input_interview_type)
  ) then
    insert into public.tasks (user_id, project_id, opportunity_id, title, category, priority, due_at, created_by)
    values (current_user_id, opportunity_project_id, input_opportunity_id, 'Prepare for ' || trim(input_interview_type), 'interview', 'high', preparation_due_at, 'system');
  end if;

  return interview_id;
end;
$$;

grant execute on function public.schedule_interview(uuid, text, timestamptz, integer, text, text, text) to authenticated;

create or replace function public.set_active_search_project(input_project_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.search_projects
    where id = input_project_id and user_id = current_user_id and status <> 'archived'
  ) then raise exception 'Search Project not found'; end if;
  update public.profiles set active_project_id = input_project_id where user_id = current_user_id;
end;
$$;

grant execute on function public.set_active_search_project(uuid) to authenticated;

create or replace function public.complete_roleway_onboarding(
  input_full_name text,
  input_headline text,
  input_summary text,
  input_project_name text,
  input_target_titles text[],
  input_technologies text[],
  input_remote_preference text,
  input_locations text[],
  input_minimum_compensation integer,
  input_currency text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  project_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(input_full_name)) < 2 then raise exception 'A full name is required'; end if;
  if char_length(trim(input_project_name)) < 2 then raise exception 'A Search Project name is required'; end if;
  if input_remote_preference not in ('required', 'preferred', 'flexible') then raise exception 'Invalid remote preference'; end if;

  select active_project_id into project_id from public.profiles where user_id = current_user_id for update;
  if project_id is null then
    insert into public.search_projects (user_id, name)
    values (current_user_id, trim(input_project_name)) returning id into project_id;
  else
    update public.search_projects set
      name = trim(input_project_name),
      objective = case when coalesce(input_target_titles[1], '') <> '' then 'Find the right next ' || input_target_titles[1] || ' opportunity' else objective end,
      target_titles = coalesce(input_target_titles, '{}'),
      preferred_technologies = coalesce(input_technologies, '{}'),
      remote_preference = input_remote_preference,
      locations = coalesce(input_locations, '{}'),
      minimum_compensation = input_minimum_compensation,
      currency = upper(input_currency)
    where id = project_id and user_id = current_user_id;
  end if;

  insert into public.profiles (user_id, full_name, headline, summary, onboarding_completed, active_project_id)
  values (current_user_id, trim(input_full_name), trim(input_headline), trim(input_summary), true, project_id)
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    headline = excluded.headline,
    summary = excluded.summary,
    onboarding_completed = true,
    active_project_id = project_id;

  insert into public.career_preferences (
    user_id, target_titles, preferred_technologies, remote_preference,
    allowed_locations, minimum_compensation, currency
  ) values (
    current_user_id, coalesce(input_target_titles, '{}'), coalesce(input_technologies, '{}'),
    input_remote_preference, coalesce(input_locations, '{}'), input_minimum_compensation, upper(input_currency)
  ) on conflict (user_id) do update set
    target_titles = excluded.target_titles,
    preferred_technologies = excluded.preferred_technologies,
    remote_preference = excluded.remote_preference,
    allowed_locations = excluded.allowed_locations,
    minimum_compensation = excluded.minimum_compensation,
    currency = excluded.currency;

  return project_id;
end;
$$;

grant execute on function public.complete_roleway_onboarding(text, text, text, text, text[], text[], text, text[], integer, text) to authenticated;

-- New accounts always have a project context; onboarding names and configures it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_id uuid;
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  select active_project_id into project_id from public.profiles where user_id = new.id;
  if project_id is null then
    insert into public.search_projects (user_id, name, objective)
    values (new.id, 'My job search', 'Find the right next opportunity')
    returning id into project_id;
    update public.profiles set active_project_id = project_id where user_id = new.id;
  end if;
  return new;
end;
$$;

-- Notifications inherit project scope from the record that caused them.
create or replace function public.create_workspace_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare enabled boolean;
begin
  if tg_table_name = 'interviews' then
    if tg_op = 'INSERT' then
      select coalesce((select interview_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'interview', 'Interview scheduled', '/preparation/' || new.id::text);
      end if;
    end if;
  elsif tg_table_name = 'opportunities' then
    if tg_op = 'UPDATE' and old.stage is distinct from new.stage then
      select coalesce((select pipeline_updates from public.notification_preferences where user_id = new.user_id), true) into enabled;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'pipeline', 'Opportunity moved to ' || initcap(new.stage::text), '/opportunities/' || new.id::text);
      end if;
    end if;
  elsif tg_table_name = 'tasks' then
    if tg_op = 'INSERT' then
      select coalesce((select task_reminders from public.notification_preferences where user_id = new.user_id), true) into enabled;
      if enabled then
        insert into public.notifications (user_id, project_id, notification_type, title, href)
        values (new.user_id, new.project_id, 'task', 'Task added · ' || new.title, case when new.opportunity_id is null then '/today' else '/opportunities/' || new.opportunity_id::text end);
      end if;
    end if;
  end if;
  return new;
end;
$$;
