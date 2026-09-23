alter table public.search_projects
  add column icon_type text not null default 'icon',
  add column icon_value text not null default 'briefcase',
  add column icon_color text not null default '#5E6AD2',
  add constraint search_projects_icon_type_check check (icon_type in ('icon', 'emoji')),
  add constraint search_projects_icon_value_check check (char_length(icon_value) between 1 and 32),
  add constraint search_projects_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$');

comment on column public.search_projects.icon_type is 'Workspace mark type: a supported icon name or emoji.';
comment on column public.search_projects.icon_value is 'Supported icon name or a single selected emoji used for the Workspace mark.';
comment on column public.search_projects.icon_color is 'Hex color used for the Workspace mark and its soft background.';

update public.search_projects project
set
  icon_type = 'icon',
  icon_value = case project.name
    when 'Product leadership' then 'target'
    when 'AI product studios' then 'sparkles'
    when 'My job search' then 'compass'
    else 'briefcase'
  end,
  icon_color = case project.name
    when 'Product leadership' then '#5E6AD2'
    when 'AI product studios' then '#8B5CF6'
    when 'My job search' then '#0F9D75'
    else '#5E6AD2'
  end
where project.user_id in (
  select id from auth.users where lower(email) = 'vanajvanguardia@gmail.com'
);
