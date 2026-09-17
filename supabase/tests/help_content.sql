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
