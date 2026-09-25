-- The current public guide covers every supported Create flow and cross-links records.
do $$ begin
  if not exists(select 1 from public.help_articles where slug='agent-create' and body like '%## Create an interview%' and body like '%## Create a contact%' and body not like '%Jobs, Opportunities, contacts, interviews, and documents are created through their normal%') then
    raise exception 'Agent Help Center capabilities are stale';
  end if;
  if (select count(*) from public.help_articles where slug in ('interviews-and-preparation','contacts-and-follow-ups') and body like '%## Create with Agent%') <> 2 then
    raise exception 'Interview and contact guides must link to Agent creation';
  end if;
end $$;

-- Reapplying seed migrations must preserve existing editorial content verbatim.
begin;
update public.help_articles set
  body = E'Before you start\nCustom Settings → AI instructions.',
  updated_at = '2026-01-01T00:00:00Z'
where slug = 'agent-create';
\ir ../migrations/20260917051125_agent_creation_help.sql
\ir ../migrations/20260917051422_complete_help_center_guides.sql
do $$ begin
  if not exists (
    select 1 from public.help_articles where slug = 'agent-create'
      and body = E'Before you start\nCustom Settings → AI instructions.'
      and updated_at = '2026-01-01T00:00:00Z'
  ) then raise exception 'Help seed migrations changed an existing editorial article'; end if;
end $$;
rollback;
