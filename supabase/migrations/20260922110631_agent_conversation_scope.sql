-- Preserve the meaning of existing account-wide conversations; new contextual
-- conversations explicitly opt into their already ownership-checked project_id.
alter table public.agent_conversations
  add column scope_mode text not null default 'account'
    check (scope_mode in ('account', 'workspace')),
  add column context_page text not null default 'agent'
    check (context_page in ('agent', 'home', 'inbox', 'opportunities', 'interview', 'contacts', 'documents', 'insights'));

comment on column public.agent_conversations.scope_mode is
  'Account reads all owned active Workspaces; workspace reads only project_id. Existing conversations remain account-wide.';
comment on column public.agent_conversations.context_page is
  'Validated starting page, retained as conversation context across navigation.';

-- Existing owner and project relationship policies remain the authorization seam.
-- Do not reinterpret a saved conversation when the UI changes Workspace.
create function public.keep_agent_conversation_scope() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.scope_mode is distinct from old.scope_mode
    or new.context_page is distinct from old.context_page
    or new.project_id is distinct from old.project_id
    or (new.opportunity_id is distinct from old.opportunity_id and new.opportunity_id is not null) then
    raise exception 'Start a new conversation to change its context';
  end if;
  return new;
end;
$$;
create trigger keep_agent_conversation_scope
  before update on public.agent_conversations
  for each row execute function public.keep_agent_conversation_scope();

-- Account for the additive metadata in the existing content-byte ledger.
update public.account_usage u
set content_bytes = u.content_bytes + s.bytes
from (
  select user_id, sum(octet_length(to_jsonb(c)::text) - octet_length((to_jsonb(c) - 'scope_mode' - 'context_page')::text))::bigint bytes
  from public.agent_conversations c group by user_id
) s where u.user_id = s.user_id;
