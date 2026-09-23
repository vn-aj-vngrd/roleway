alter table public.search_projects
  add column ticket_key text;

create or replace function public.assign_search_project_ticket_key()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_key text;
  candidate text;
  suffix integer := 1;
begin
  if new.ticket_key is not null and btrim(new.ticket_key) <> '' then
    new.ticket_key := upper(btrim(new.ticket_key));
    return new;
  end if;

  base_key := left(regexp_replace(upper(new.name), '[^A-Z0-9]', '', 'g'), 3);
  if length(base_key) < 2 then
    base_key := left(base_key || 'RW', 3);
  end if;
  candidate := base_key;

  while exists (
    select 1
    from public.search_projects existing
    where existing.user_id = new.user_id
      and existing.ticket_key = candidate
      and existing.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := left(base_key, 8) || suffix::text;
  end loop;

  new.ticket_key := candidate;
  return new;
end;
$$;

create trigger assign_search_project_ticket_key
before insert or update of ticket_key on public.search_projects
for each row execute function public.assign_search_project_ticket_key();

do $$
declare
  project_record record;
begin
  for project_record in
    select id
    from public.search_projects
    where ticket_key is null
    order by user_id, created_at, id
  loop
    update public.search_projects
    set ticket_key = null
    where id = project_record.id;
  end loop;
end;
$$;

update public.search_projects project
set ticket_key = case project.name
  when 'Product leadership' then 'PLD'
  when 'AI product studios' then 'APS'
  when 'My job search' then 'JOB'
  else project.ticket_key
end
where project.user_id in (
  select id from auth.users where lower(email) = 'vanajvanguardia@gmail.com'
)
and project.name in ('Product leadership', 'AI product studios', 'My job search');

alter table public.search_projects
  alter column ticket_key set not null,
  add constraint search_projects_ticket_key_format
    check (ticket_key ~ '^[A-Z][A-Z0-9]{1,9}$');

create unique index search_projects_user_ticket_key_unique
  on public.search_projects (user_id, ticket_key);

comment on column public.search_projects.ticket_key is
  'Workspace-configurable prefix used to display Opportunity identifiers.';
