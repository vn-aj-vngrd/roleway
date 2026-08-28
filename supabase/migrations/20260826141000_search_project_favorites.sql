alter table public.search_projects
  add column is_favorite boolean not null default false;

create index search_projects_user_favorite_idx
  on public.search_projects(user_id, is_favorite desc, updated_at desc)
  where status <> 'archived';
