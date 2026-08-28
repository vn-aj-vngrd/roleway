# Roleway Agent

## Product decision

Roleway Agent is the native conversational work surface for a focused job search. It replaces the current form-first “Assist run” presentation without discarding its safety model, provider connections, structured drafts, or approval history.

Agent is a product highlight because it can answer questions across the Account’s Workspaces and turn approved context into reviewable work. It is not an auto-apply service, recruiter impersonator, generic web chatbot, or background autopilot.

Canonical language remains in [`CONTEXT.md`](../CONTEXT.md). Architecture constraints remain in [`PLANNING.md`](PLANNING.md). Interface behavior follows [`LINEAR-COMPONENT-CATALOG.md`](LINEAR-COMPONENT-CATALOG.md).

## Implemented baseline

The native baseline now includes account-wide conversations and messages, conversation history/archive, BYO provider selection, personal guidance, grounded all-Workspace context, durable Agent Runs and steps, validated proposal output, exact Approval cards, approve/reject decisions, global Agent access, contextual Opportunity entry, export coverage, and responsive light/dark UI.

Implemented approved tools are `create_workspace`, `create_task`, `set_next_action`, and `create_note`. Additional internal domain tools must follow the same schema, scope trigger, RLS, approval, idempotency, activity, export, and recovery requirements before appearing in the interface. Attachments, prompt templates, streaming, cancellation, and external connectors are not represented as working controls yet. External actions remain intentionally unavailable.

## User promise

> Ask about your search, prepare the next piece of work, and approve exactly what changes.

The core application remains complete without AI. Users connect their own supported provider API account when they want Agent. Provider billing is direct and credentials are encrypted before storage.

## Primary workflow

1. User opens **Agent** from the global sidebar or from a contextual entry on an Opportunity, Job, interview, contact, document, or Home item.
2. The route identifies the Account’s available Workspaces and any focused record before sending anything.
3. User starts a new conversation or resumes history.
4. User asks a question or requests preparation.
5. Roleway shows the context categories that will be sent and starts a durable Agent Run.
6. Agent reads only permitted data across owned Workspaces and shows concise progress.
7. Agent returns an answer, draft, or proposed internal changes.
8. Drafts remain in the transcript. Proposed mutations render exact Approval cards.
9. User rejects, edits, or approves each proposal.
10. The server rechecks authentication, Workspace ownership, proposal freshness, and domain invariants before applying.
11. Applied changes appear in the originating record and its activity history.

## Essential v1 features

### Conversation

- New conversation with a clean context boundary.
- Resume and search conversation history.
- Multiple conversations; one active conversation at a time in web v1.
- User and Agent messages rendered as a working transcript, not speech bubbles.
- Cancel an in-progress run.
- Retry failed or interrupted runs without duplicating approved mutations.
- Delete/archive a conversation with an explicit confirmation.

### Context

- At least one Workspace is mandatory.
- Optional focus: Opportunity, Job, interview, contact, or document.
- Account-wide Career Profile may be included only when relevant and disclosed.
- Context drawer shows selected categories and focused records.
- Every proposed mutation identifies and rechecks its exact destination Workspace.
- Job descriptions and rich text are sanitized and converted to bounded plain text before provider use.

### Questions Agent should answer

- What requires attention today?
- Which Opportunities have no clear Next Action?
- What changed in this Opportunity?
- What should I prepare for this interview?
- What evidence supports a Job requirement?
- Which follow-ups are overdue?
- Summarize this Workspace or selected record from stored facts.

Answers must distinguish stored facts, provider inference, missing information, and proposed work.

### Drafts Agent should prepare

- Next Action options.
- Opportunity tasks.
- Follow-up drafts that the user sends externally themselves.
- Interview questions and preparation plans.
- Opportunity notes.
- Document sections based on approved Career Evidence.
- Fit analysis without an opaque score.
- Application-plan suggestions.

### Internal tools

Initial read tools:

- `search_workspace`
- `read_opportunity`
- `read_job`
- `read_interview`
- `read_contact`
- `read_document_excerpt`
- `read_today_queue`
- `read_career_profile`

Initial proposal tools:

- `propose_next_action`
- `propose_task`
- `propose_note`
- `propose_interview_plan`
- `propose_document_draft`

Initial approved mutation tools:

- `apply_next_action`
- `create_task`
- `create_note`
- `save_document_draft`

No external-action tools exist. Agent cannot submit applications, send messages, contact employers, schedule external events, or access arbitrary URLs.

## Approval model

Every proposed mutation stores:

- conversation and Agent Run;
- destination Workspace;
- target record and type;
- normalized tool name;
- validated arguments;
- human-readable exact change summary;
- proposal status;
- creation and expiry timestamps;
- approval/rejection actor and time;
- application result or redacted error code.

Proposal states:

```text
proposed → approved → applying → applied
         ↘ rejected
         ↘ expired
         ↘ superseded
approved → failed (retryable only when idempotent)
```

Continuing the conversation never means approval. Bulk approval is not part of v1.

## Agent Run model

```text
queued → gathering_context → generating → awaiting_approval → completed
   └──────────────→ failed
   └──────────────→ cancelled
```

A run may complete without proposals. `awaiting_approval` means generation finished and at least one proposal remains undecided.

Run details visible to the user:

- provider and model;
- started/completed time;
- context categories;
- bounded progress-step summaries;
- draft/answer;
- proposals and approvals;
- token usage when the provider reports it;
- retryable recovery message.

Do not expose hidden system prompts, encrypted credentials, internal stack traces, or private raw provider payloads.

## Provider behavior

Supported BYO providers remain OpenAI, Anthropic, Gemini, OpenRouter, and public HTTPS OpenAI-compatible APIs.

Provider adapters must support:

- bounded conversation messages;
- one trusted system policy;
- explicit context data separated from user instructions;
- structured tool proposal output;
- timeout and cancellation;
- token metadata where available;
- independent Zod validation of every response and tool argument.

Provider output is untrusted. Markdown is sanitized before display. Tool names and arguments are accepted only from an allowlist.

## Personalization

### Personal guidance

Users may provide bounded guidance such as response style, preferred level of detail, or preparation conventions. Guidance is treated as user instruction below security and domain policies. It cannot grant tools or bypass approval.

### Prompt templates

Roleway’s initial equivalent of Linear Skills is a user-authored prompt template:

- name;
- short purpose;
- prompt text;
- optional recommended context categories;
- account-private by default.

Templates can fill the Agent composer but never auto-submit. Automatic skill selection, shared templates, schedules, loops, and MCP connectors are not v1 features.

## Interface

### Empty conversation

- `44px` route bar with Agent title/chat switcher and history.
- Open work plane with a quiet Roleway waypoint watermark.
- Centered composer.
- Context and template controls at lower-left.
- Attachment and submit at lower-right.
- If no provider is connected, the composer remains visible but clearly disabled with a direct setup action.

### Active conversation

- Transcript scroll region.
- Stable bottom composer.
- Compact context summary above or inside composer.
- Messages use document blocks with explicit authorship.
- Progress and tool steps are inline, collapsible details.
- Approval cards sit directly after the Agent message that proposed them.

### History

- Search.
- Recency groups.
- Conversation title, focused record, recency, status, and overflow.
- New conversation action.
- Mobile history uses a sheet/dedicated surface.

### Settings

- Provider connections.
- Personal guidance.
- Prompt templates.
- Data/context disclosure.
- Conversation retention and deletion when implemented.
- Explicit statement that external actions are unavailable.

## Responsive behavior

- Desktop uses the standard 244px sidebar and inset work plane.
- Mobile is full-bleed with a 44px route bar.
- Empty composer uses 16–24px side margins on mobile.
- Active composer stays above navigation/safe area.
- History, context, templates, and approvals become sheets or stacked sections.
- No horizontal transcript overflow.
- Attachments and long generated content wrap or use bounded internal scrolling.

## Security and privacy

- `requireSearchContext()` authenticates every conversation render and action and resolves the Account’s owned Workspaces.
- Conversations and history are account-owned; operational targets remain Workspace-owned.
- Server actions refilter target records by user and derive the destination `project_id` from the target.
- RLS and relationship triggers reject cross-owner access and invalid Workspace relationships.
- Provider credentials stay in server-only modules and remain encrypted with AES-256-GCM.
- API keys are never returned after save.
- Context is sent only after a user starts a run.
- No background provider calls in v1.
- System event metadata stores redacted codes only—never prompts, messages, descriptions, emails, keys, or stack traces.
- Rate limits bound runs, message length, context size, attachments, and provider retries.
- Prompt-injection text inside Jobs/documents is explicitly delimited as data and cannot select tools or override policy.

## Data-source-of-truth requirements

Adding Agent relations requires a forward Supabase migration and explicit ownership protections:

1. migration and safe backfill from compatible historic Assist runs where useful;
2. account ownership plus destination-Workspace attribution for mutations;
3. RLS ownership and relationship checks;
4. export, search, and Admin health implications.

Suggested relations:

- `agent_conversations`
- `agent_messages`
- `agent_run_steps`
- `agent_proposals`
- `agent_prompt_templates`

Existing `ai_connections` remains account-wide. Existing `ai_runs` should be extended or migrated rather than duplicated without a clear compatibility plan.

## Failure and recovery states

- No provider: direct connection setup; core app remains available.
- Untested provider: Test connection action.
- Provider rejected key/model: connection-level recovery without exposing secret.
- Timeout/rate limit: retry with the same user message and no mutation.
- Invalid output: preserve conversation, record failed run, invite retry.
- Context record removed: explain stale focus and offer to continue without it.
- Proposal stale: expire and regenerate; never apply against changed assumptions silently.
- Approval application failed: keep exact proposal and safe retry if idempotent.
- Focused Workspace archived: explain the stale focus and continue account-wide or start a clean conversation.

## Acceptance criteria

- Agent can answer a grounded cross-Workspace question with a connected BYO provider.
- Agent can produce a reviewable draft without changing domain records.
- Agent can propose a Next Action and cannot apply it without explicit approval.
- Approval rechecks owner, Workspace, target, and proposal status server-side.
- Applied proposals write activity history.
- Conversation history survives navigation and clearly identifies context.
- A clean new conversation does not reuse prior thread messages.
- Secrets and raw prompts never appear in client payloads, exports, logs, or system events.
- Normal users cannot access another user’s conversations or proposals.
- Cross-Workspace context cannot cause a mutation to land outside its explicitly resolved target Workspace.
- Provider timeout, malformed output, and invalid proposal have unambiguous recovery.
- Desktop and mobile have no horizontal overflow or dead controls.
- Keyboard focus, Escape, reduced motion, dark mode, and screen-reader names work.
- No external action can be triggered from Agent.

## Rollout

1. **Native shell:** replace form-first Assist presentation with empty/active conversation shell while preserving existing structured runs.
2. **Conversation persistence:** add conversations/messages and migrate compatible run history.
3. **Grounded Q&A:** bounded all-Workspace context and read-only answers.
4. **Draft tools:** structured draft artifacts in the transcript.
5. **Approvals:** exact internal proposals and approved mutation execution.
6. **Guidance/templates:** personal guidance and prompt templates.
7. **Contextual entry points:** Opportunity, interview, document, Home, and Job links into the same Agent system.

Each phase ships only when its normal, error, permission-denial, mobile, dark, and reduced-motion workflows are verified in a real browser.
