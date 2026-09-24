# Roleway Agent: Create and Explore

This is the implementation contract and audit for the current Agent version. For the concise technical flow, packages, and diagrams, see [How Roleway Agent works](HOW_ROLEWAY_AGENT_WORKS.md). Read this contract when changing chat, context gathering, provider instructions, capability discovery, or approvals. Domain language lives in [CONTEXT.md](../CONTEXT.md); ownership rules live in [PLANNING.md](PLANNING.md).

## User journey

1. Connect and test a supported API provider in Settings → Agent. Without a connection, show a direct setup action.
2. Open Agent, optionally focused on a Workspace or Opportunity, and start or resume a conversation. Opening the floating Agent on a Workspace page retains that Workspace and starting page when expanded. Saved conversation scope remains fixed; start a new conversation to change scope. Direct Agent starts account-wide.
3. Use `+`, the `/` button, or type `/` at the start of the composer to discover Create and Explore. Both buttons open the same composer-width popover above the input. Typing filters commands; arrows and Enter select; Escape dismisses. Selection fills a prompt for review; Send starts the conversation.
4. For Create, ask one missing question at a time. Reuse supplied information, clarify ambiguous targets and dates, and show an exact proposal once the required details are present.
5. Approve or reject the proposal. Only successful database application means a record was created. Continuing the conversation is not approval.
6. After approval, show Creating Workspace…, Creating task…, Creating note…, or Setting Next Action… while saving. Confirm the specific saved result and offer Open. Task, note and Next Action controls verify the applied proposal and destination, switch Workspace, and open the relevant Opportunity section. Newly created Workspaces link to their settings page; older history without the creation-result URL links to the Workspace list.
7. Resume from durable history. Messages show local calendar dates/times and copy controls beneath rounded message bubbles. Mobile retains the same actions and approval flow.

**Complete when:** a person can discover an action, answer naturally without a creation form, review the destination and details, approve once, and find exactly one resulting record after reload.

## Help Center

The public guide at `/help/agent-create` explains setup, all four Create flows, approval, corrections and recovery. It remains accessible through Help & support. The forward migration `20260917051125_agent_creation_help.sql` inserts it into the existing admin-editable Help Center; deploy that migration with the Agent interface. Existing editorial content is preserved if the slug already exists.

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
- Context is bounded: up to 100 active Opportunities and outstanding tasks, 60 Inbox Jobs/scheduled interviews/contacts/documents, 12 recent conversation messages and 20 recent proposal summaries/statuses. A snapshot is not exhaustive account search.
- Career Profile includes name, headline and summary, plus career preferences. There is no separate structured Career Evidence store; approved documents can provide additional evidence through scoped reads.
- The focused Opportunity is fetched independently of the snapshot cap. Scoped read tools search paginated Opportunities/Jobs/documents and retrieve source text, notes/activity, profile facts and earlier conversation messages. Five model steps per attempt and six read calls total bound the run (including its optional answer repair); each read returns at most 24,000 characters with a truncation flag.
- Provider answers must identify missing context rather than claim they inspected absent source material. Recent proposal states distinguish proposed, rejected and applied work. The latest four valid proposals also include their exact sanitized fields for corrections; ask again when older details are absent. Contacts with follow-up dates are ordered by due date before the 60-record cap.
- Provider output is untrusted. Validate proposal arguments, sanitize note content, verify targets, and use the atomic completion/approval database functions.
- Corrections explicitly reference `supersedesProposalId`. Atomic completion retires only that pending proposal; unrelated proposals remain available. Conversation locks serialize revisions with approvals. Deploy `20260924144440_agent_proposal_revisions.sql` before the application update.
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
- Exhaustive account analysis beyond the bounded read budget. Retrieved source material and pagination do not imply every record has been inspected.
- In-progress stream resumption, a dedicated retry control, searchable/paginated history, attachments, reusable prompt templates and external integrations.
- Multi-turn creation is model-guided, not a persisted deterministic questionnaire. Older conversation messages can be retrieved on demand; missing or truncated information still requires clarification.
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
- Broader browser run: 33 passed, two pipeline tests failed on a landing-page Base UI native-button warning, one live-provider test skipped. The public-signup journey remained at a disabled Create account button and was interrupted after three minutes; seven later tests did not run. This is not a green full-suite result.
- Follow-up with `E2E_AUTH_MODE=admin`: all five critical journeys passed, including Opportunity/application/interview workflows, Workspace isolation, export/search, normal-user admin denial, cross-owner RLS denial, and account deletion. This fixture verifies the authenticated product, not CAPTCHA/password signup.

### Creation feedback follow-up

- Saved Opportunity notes now appear under Activity → Notes, with sanitized rich text, empty and loading-error states.
- Explore scopes operational records to available Workspaces and excludes completed/cancelled tasks and interviews so historical work cannot fill the snapshot ahead of outstanding work.
- Verification covers all nine Explore prompts delivering available context to the provider seam, unavailable result authorization, and browser approval/result navigation for all four Create actions. Provider fixtures do not verify a live model's conversational choices.

- Workspace capacity failures use the shared plan-limit explanation and preserve the proposal for retry. Success redirects anchor the saved card into view on long mobile chats.

- Follow-up verification: all four approval → persisted record → Open browser journeys passed at desktop/mobile sizes, including reload, visible result controls, cross-Workspace navigation, Workspace capacity rejection and retry, and one saved record per creation. Stale Next Action recovery also passed. All 122 unit tests passed, including the nine Explore context paths and result authorization checks. The live-provider browser test remains skipped because its opt-in key is absent.
