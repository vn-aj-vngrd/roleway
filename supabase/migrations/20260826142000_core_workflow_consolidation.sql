-- Consolidate intake around the Job Inbox and make deferred Jobs recoverable.
-- The legacy enum value `inbox` remains in PostgreSQL for safe forward compatibility,
-- but existing rows are migrated and the constraint prevents future use.

update public.opportunities
set stage = 'interested'
where stage = 'inbox';

alter table public.opportunities
  add constraint opportunities_no_legacy_inbox_stage_check
  check (stage <> 'inbox'::public.opportunity_stage);

alter table public.jobs
  add column inbox_review_at timestamptz;

-- Existing indefinite Maybe records return to the review queue immediately.
update public.jobs
set inbox_review_at = now()
where inbox_state = 'maybe';

create index jobs_project_review_at_idx
  on public.jobs(project_id, inbox_review_at)
  where inbox_state = 'maybe';

-- Application volume is not the product goal; keep the legacy column neutral
-- until a future progress measure has a defined workflow.
alter table public.search_projects
  alter column weekly_application_goal set default 0;
