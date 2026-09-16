# Roleway Agent: Create and Explore

This is the implementation contract and audit for the current Agent version. Read it when changing chat, context gathering, provider instructions, capability discovery, or approvals. Domain language lives in [CONTEXT.md](../CONTEXT.md); ownership rules live in [PLANNING.md](PLANNING.md).

## User journey

1. Connect and test a supported API provider in Settings → AI. Without a connection, show a direct setup action.
2. Open Agent, optionally focused on an Opportunity, and start or resume a conversation.
3. Use `+`, the `/` button, or type `/` at the start of the composer to discover Create and Explore. Both buttons open the same composer-width popover above the input. Typing filters commands; arrows and Enter select; Escape dismisses. Selection fills a prompt for review; Send starts the conversation.
4. For Create, ask one missing question at a time. Reuse supplied information, clarify ambiguous targets and dates, and show an exact proposal once the required details are present.
5. Approve or reject the proposal. Only successful database application means a record was created. Continuing the conversation is not approval.
6. Resume from durable history. Messages show local calendar dates/times and copy controls beneath rounded message bubbles. Mobile retains the same actions and approval flow.

**Complete when:** a person can discover an action, answer naturally without a creation form, review the destination and details, approve once, and find exactly one resulting record after reload.

## Current capability boundary

`apps/web/src/features/agent/capabilities.ts` owns the discoverable prompt catalog. Provider policy is in `apps/web/src/lib/ai/providers.ts`; shared schemas allow only the four mutation tools below. Database approval functions remain the execution authority.

| Create | Information to gather | Result after approval |
| --- | --- | --- |
| Workspace | Name and search objective | New focused job-search Workspace |
| Task | Exact Opportunity/Workspace, title, optional due date | Opportunity task |
| Next Action | Exact Opportunity/Workspace, title, optional due date | Updated Next Action |
| Note | Exact Opportunity/Workspace and note text | Opportunity note |

The model gathers details through conversation; schema validation and database authorization guard execution. Date interpretation receives the browser timezone and current server time. Ask about ambiguous time references. A missing optional date is represented as null, not invented.

Explore offers Today/follow-ups, Workspaces, Opportunities, Inbox Jobs, tasks, interviews, contacts, document inventory, and Career Profile/fit. It can prepare follow-up text, interview questions, document sections, fit explanations and application plans in the transcript. Users copy these drafts and perform external actions themselves.

**Complete when:** every catalog item maps to actual context or a supported draft, missing information prompts a follow-up question, and no menu item implies an unsupported write or external action.

## Context and safety

- Reads are authenticated and account-owned; mutations resolve one exact destination Workspace.
- Context is bounded: up to 100 active Opportunities and tasks, 60 Inbox Jobs/interviews/contacts/documents, 12 recent conversation messages and 20 recent proposal summaries/statuses. A snapshot is not exhaustive account search.
- Career Profile includes name, headline and summary, plus career preferences. Full career evidence is not loaded.
- Only a focused Opportunity includes a bounded plain-text Job description. Documents contribute metadata, not their contents. Notes and activity history are not currently read.
- Provider answers must identify missing context rather than claim they inspected absent source material. Recent proposal states distinguish proposed, rejected and applied work.
- Provider output is untrusted. Validate proposal arguments, sanitize note content, verify targets, and use the atomic completion/approval database functions.
- Approval rechecks ownership, destination, status, expiry and domain rules. Next Action proposals retain the pre-generation value/date so stale approvals preserve intervening edits.
- Credentials remain encrypted and server-only. Redacted system events must never include prompts, document text, API keys or provider payloads.
- All supported providers use the same creation policy. External messages, applications, calendar events and arbitrary URL access are unavailable.

## Audit findings and version decisions

| Finding | Current decision |
| --- | --- |
| Working mutation tools were hidden behind an empty textarea | Expose all four under Create; expose supported context and draft prompts under Explore |
| Creation had no step-by-step instruction | Require one missing question at a time, reuse known facts and propose only after details are available |
| Earlier checkout omitted Next Action due dates | Latest main already includes them; preserve this freshness guard |
| Model lacked current date/timezone and prior approval outcomes | Include server time, browser timezone and recent proposal states |
| Conversation links depended on the newest 40 history entries | Resolve the selected owned conversation independently |
| Long transcripts loaded the oldest messages | Display the most recent 200 messages in chronological order |
| Existing doc mixed proposed tools and implemented features | This contract separates current scope from deferred capabilities |
| Transcript styling lacked requested chat affordances | Rounded bubbles, local Today/Yesterday timestamps, Copy, responsive composer and action picker |

### Remaining limitations

These are not presented as working controls:

- Creation of Jobs, Opportunities, contacts, interviews, documents and applications. Each needs its own validated proposal and approval transaction that preserves the existing domain side effects and quota checks before being advertised.
- Exhaustive Explore/search, document-body retrieval, full career evidence, notes and activity-history reads. Add bounded on-demand retrieval before promising complete historical analysis.
- Streaming, cancellation, resumable runs, dedicated retry, searchable/paginated history, attachments, reusable prompt templates and external integrations.
- Multi-turn creation is model-guided, not a persisted deterministic questionnaire. Conversations longer than the recent-message window can require clarification again.
- The hourly run limit is a count-before-insert check, not an atomic reservation; simultaneous requests can race. Stronger concurrency guarantees require a database-backed reservation.

For this version, finish and verify the bounded Create/Explore flow before expanding the mutation surface. Preserve the explicit approval step.

## Verification and handoff

1. Test each Create flow with missing information, complete information, corrections, an ambiguous Opportunity and ambiguous dates. During clarification there must be no proposal or domain write.
2. Test approval/rejection, double approval, stale Next Action, cross-owner access, and reload persistence. Verify the resulting domain record, not only the success banner.
3. Exercise each Explore category with populated and empty context; verify the response acknowledges omitted source text and snapshot limits.
4. Exercise `+`, slash button, typed filtering, keyboard selection, Escape, outside dismissal, copy success/failure, long text and disabled-provider setup.
5. At 1440px and 390px, inspect light/dark rendering, touch targets, focus, panel width/placement, browser console/network errors and horizontal overflow.
6. Run the repository checks from AGENTS.md. Separate fixture UI/database evidence from live provider evidence and from deployment evidence.

**Release gate:** record actual pass/fail/skip evidence. A prompt instruction or provider fixture does not prove live multi-turn behavior; a local implementation does not prove hosted migration or deployment state.

## Verification evidence — 2026-09-17

- Typecheck, unit tests (103 web + 5 core), lint, workflow checks and production build passed locally.
- The Agent browser regression passed against a disposable account: desktop/mobile picker geometry, all 13 catalog items, slash filtering, keyboard selection/Escape, clipboard contents, local timestamps, dark mobile rendering, no horizontal overflow, and stale Next Action rejection without overwriting the manual edit.
- Live provider testing requires `ROLEWAY_TEST_OPENROUTER_KEY`; it was not configured. Conversational creation policy has not been verified against a live model in this change.
- No database migration or hosted deployment is part of this change.
