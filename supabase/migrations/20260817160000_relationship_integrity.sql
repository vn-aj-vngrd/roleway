create or replace function public.owns_opportunity(input_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opportunities
    where id = input_opportunity_id and user_id = auth.uid()
  );
$$;

grant execute on function public.owns_opportunity(uuid) to authenticated;

create or replace function public.owns_job(input_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs
    where id = input_job_id and user_id = auth.uid()
  );
$$;

grant execute on function public.owns_job(uuid) to authenticated;

drop policy if exists "opportunities_owned" on public.opportunities;
create policy "opportunities_owned" on public.opportunities
for all using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and public.owns_job(job_id));

drop policy if exists "tasks_owned" on public.tasks;
create policy "tasks_owned" on public.tasks
for all using ((select auth.uid()) = user_id and (opportunity_id is null or public.owns_opportunity(opportunity_id)))
with check ((select auth.uid()) = user_id and (opportunity_id is null or public.owns_opportunity(opportunity_id)));

drop policy if exists "notes_owned" on public.opportunity_notes;
create policy "notes_owned" on public.opportunity_notes
for all using ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id))
with check ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id));

drop policy if exists "events_owned" on public.opportunity_events;
create policy "events_owned" on public.opportunity_events
for all using ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id))
with check ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id));

drop policy if exists "interviews_owned" on public.interviews;
create policy "interviews_owned" on public.interviews
for all using ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id))
with check ((select auth.uid()) = user_id and public.owns_opportunity(opportunity_id));

drop policy if exists "documents_owned" on public.documents;
create policy "documents_owned" on public.documents
for all using ((select auth.uid()) = user_id and (opportunity_id is null or public.owns_opportunity(opportunity_id)))
with check ((select auth.uid()) = user_id and (opportunity_id is null or public.owns_opportunity(opportunity_id)));
