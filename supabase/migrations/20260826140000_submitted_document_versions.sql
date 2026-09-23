alter table public.application_records
  add column resume_version_id uuid references public.document_versions(id) on delete set null,
  add column cover_letter_version_id uuid references public.document_versions(id) on delete set null;

create or replace function public.assign_submitted_document_versions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.resume_version_id := null;
  new.cover_letter_version_id := null;
  if new.resume_document_id is not null then
    select id into new.resume_version_id
    from public.document_versions
    where document_id = new.resume_document_id and user_id = new.user_id and project_id = new.project_id
    order by version desc limit 1;
    if new.resume_version_id is null then raise exception 'The resume has no saved version'; end if;
  end if;
  if new.cover_letter_document_id is not null then
    select id into new.cover_letter_version_id
    from public.document_versions
    where document_id = new.cover_letter_document_id and user_id = new.user_id and project_id = new.project_id
    order by version desc limit 1;
    if new.cover_letter_version_id is null then raise exception 'The cover letter has no saved version'; end if;
  end if;
  return new;
end;
$$;

create trigger application_records_assign_versions
before insert or update of resume_document_id, cover_letter_document_id on public.application_records
for each row execute function public.assign_submitted_document_versions();

update public.application_records set
  resume_document_id = resume_document_id,
  cover_letter_document_id = cover_letter_document_id;
