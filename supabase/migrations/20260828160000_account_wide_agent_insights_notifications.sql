-- Agent, Insights, and the Notification Center are account-wide surfaces.
-- Their underlying operational records retain Workspace ownership and attribution.

create index if not exists agent_conversations_user_updated_idx
  on public.agent_conversations(user_id, updated_at desc)
  where status = 'active';

create index if not exists notifications_user_unread_created_idx
  on public.notifications(user_id, read_at, created_at desc);

create index if not exists application_records_user_submitted_idx
  on public.application_records(user_id, submitted_at desc);

comment on table public.agent_conversations is
  'Account-visible Roleway Agent threads. project_id preserves the originating or focused Workspace for relationship integrity; reads may include all Workspaces owned by the Account.';

comment on table public.notifications is
  'Workspace-attributed notification records aggregated by the account-wide Notification Center.';
