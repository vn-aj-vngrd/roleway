-- Keep database-generated links aligned with the product route names.
do $$
declare
  target record;
  updated_definition text;
begin
  for target in
    select p.oid, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        pg_get_functiondef(p.oid) like '%/jobs%'
        or pg_get_functiondef(p.oid) like '%/preparation%'
      )
  loop
    updated_definition := replace(target.definition, '/jobs', '/inbox');
    updated_definition := replace(updated_definition, '/preparation', '/interview');
    execute updated_definition;
  end loop;
end;
$$;

update public.notifications
set href = replace(replace(href, '/jobs', '/inbox'), '/preparation', '/interview')
where href like '/jobs%'
   or href like '/preparation%';
