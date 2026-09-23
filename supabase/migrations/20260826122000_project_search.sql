create extension if not exists pg_trgm;

create index jobs_title_trgm_idx on public.jobs using gin (lower(title) gin_trgm_ops);
create index jobs_company_trgm_idx on public.jobs using gin (lower(company) gin_trgm_ops);
create index documents_title_trgm_idx on public.documents using gin (lower(title) gin_trgm_ops);
create index contacts_name_trgm_idx on public.contacts using gin (lower(name) gin_trgm_ops);
create index contacts_company_trgm_idx on public.contacts using gin (lower(company) gin_trgm_ops);
create index opportunity_notes_body_trgm_idx on public.opportunity_notes using gin (lower(body) gin_trgm_ops);

create or replace function public.search_roleway(input_query text, input_project_id uuid)
returns table (
  kind text,
  entity_id uuid,
  title text,
  subtitle text,
  href text,
  project_id uuid
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  normalized text := lower(trim(input_query));
  pattern text;
begin
  if char_length(normalized) < 2 or char_length(normalized) > 120 then return; end if;
  if not public.owns_search_project(input_project_id) then raise exception 'Search Project not found'; end if;
  pattern := '%' || normalized || '%';

  return query
  select result.kind, result.entity_id, result.title, result.subtitle, result.href, result.project_id
  from (
    select
      'opportunity'::text as kind,
      o.id as entity_id,
      j.title,
      concat_ws(' · ', j.company, nullif(j.location, ''), initcap(o.stage::text)) as subtitle,
      '/opportunities/' || o.id::text as href,
      o.project_id,
      case when lower(j.title) = normalized then 0 when lower(j.title) like normalized || '%' then 1 when lower(j.company) like normalized || '%' then 2 else 3 end as rank
    from public.opportunities o
    join public.jobs j on j.id = o.job_id
    where o.project_id = input_project_id
      and o.user_id = auth.uid()
      and (lower(j.title) like pattern or lower(j.company) like pattern or lower(coalesce(o.next_action, '')) like pattern)

    union all

    select
      'job'::text,
      j.id,
      j.title,
      concat_ws(' · ', j.company, nullif(j.location, ''), 'Inbox'),
      '/jobs',
      j.project_id,
      case when lower(j.title) = normalized then 0 when lower(j.title) like normalized || '%' then 1 when lower(j.company) like normalized || '%' then 2 else 3 end
    from public.jobs j
    where j.project_id = input_project_id
      and j.user_id = auth.uid()
      and j.inbox_state <> 'tracked'
      and (lower(j.title) like pattern or lower(j.company) like pattern or lower(j.description) like pattern)

    union all

    select
      'document'::text,
      d.id,
      d.title,
      initcap(replace(d.kind, '_', ' ')) || ' · ' || initcap(d.status),
      '/documents/' || d.id::text,
      d.project_id,
      case when lower(d.title) = normalized then 0 when lower(d.title) like normalized || '%' then 1 else 3 end
    from public.documents d
    where d.project_id = input_project_id
      and d.user_id = auth.uid()
      and (lower(d.title) like pattern or lower(coalesce(d.content ->> 'body', '')) like pattern)

    union all

    select
      'contact'::text,
      c.id,
      c.name,
      concat_ws(' · ', nullif(c.role, ''), nullif(c.company, ''), initcap(replace(c.relationship, '_', ' '))),
      case when c.opportunity_id is null then '/today' else '/opportunities/' || c.opportunity_id::text end,
      c.project_id,
      case when lower(c.name) = normalized then 0 when lower(c.name) like normalized || '%' then 1 when lower(c.company) like normalized || '%' then 2 else 3 end
    from public.contacts c
    where c.project_id = input_project_id
      and c.user_id = auth.uid()
      and (lower(c.name) like pattern or lower(c.company) like pattern or lower(c.role) like pattern or lower(c.notes) like pattern)

    union all

    select
      'interview'::text,
      i.id,
      i.interview_type,
      concat_ws(' · ', j.company, j.title, to_char(i.starts_at at time zone 'UTC', 'Mon DD')),
      '/preparation/' || i.id::text,
      i.project_id,
      case when lower(i.interview_type) = normalized then 0 when lower(i.interview_type) like normalized || '%' then 1 else 3 end
    from public.interviews i
    join public.opportunities o on o.id = i.opportunity_id
    join public.jobs j on j.id = o.job_id
    where i.project_id = input_project_id
      and i.user_id = auth.uid()
      and (lower(i.interview_type) like pattern or lower(i.interviewers) like pattern or lower(i.preparation_notes) like pattern or lower(i.notes) like pattern)

    union all

    select
      'note'::text,
      n.id,
      left(regexp_replace(n.body, '\s+', ' ', 'g'), 100),
      j.company || ' · ' || j.title,
      '/opportunities/' || n.opportunity_id::text,
      o.project_id,
      4
    from public.opportunity_notes n
    join public.opportunities o on o.id = n.opportunity_id
    join public.jobs j on j.id = o.job_id
    where o.project_id = input_project_id
      and n.user_id = auth.uid()
      and lower(n.body) like pattern
  ) result
  order by result.rank, result.title
  limit 30;
end;
$$;

grant execute on function public.search_roleway(text, uuid) to authenticated;
