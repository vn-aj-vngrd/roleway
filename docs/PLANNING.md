# Roleway Architecture and Product Model

## Product hierarchy

```text
Account
├── Career Profile (global, user-approved facts)
├── Agent, Insights, and Notification Center (all Workspaces)
└── Workspace (one career target or strategy)
    ├── visual identity, preferences, objective, Opportunity ticket key, and weekly goal
    ├── Job Inbox
    ├── Opportunities
    ├── workspace documents and versions
    ├── workspace contacts and follow-ups
    ├── workspace interviews and preparation
    ├── Home and search
    └── archived workspace history
```

A **Job** is captured listing data. An **Opportunity** is the user’s tracked relationship with one Job. Tracking is idempotent and preserves the Job’s Workspace. One Workspace equals one focused job search. The database retains `search_projects` and `project_id` as legacy storage names. See [`CONTEXT.md`](../CONTEXT.md) for canonical language.

## Runtime architecture

- Next.js 16 App Router pages and layouts are Server Components by default.
- Tailwind CSS 4 supplies the utility/token layer; shadcn source components in `apps/web/src/components/ui` use Base UI for accessible interaction primitives.
- Product-specific layout primitives preserve Roleway’s route archetypes and compose shadcn controls rather than replacing the application structure.
- Supabase PostgreSQL migrations are the authoritative schema.
- Supabase Auth uses password sessions in HttpOnly cookies refreshed by middleware.
- `requireSearchContext()` resolves the user, profile, available Workspaces, and active Workspace once per server render.
- Pages query by the legacy `project_id` key; RLS independently checks user and Workspace ownership.
- Server Actions authenticate again and constrain resource IDs to the active Workspace.
- Client islands own only interactive state: shell commands, Workspace switching, custom controls, dialogs, rich text, board/list interaction, and the product tour.
- `packages/core` owns shared workflow metadata and approval rules; `packages/schemas` owns shared domain schemas.

There is no duplicate ORM model. Runtime database changes begin in `supabase/migrations`.

## Important modules and seams

| Module | Interface | Responsibility |
| --- | --- | --- |
| Workspace context | `requireSearchContext()` | Authenticated owner plus active Workspace scope |
| Workspace actions | create, update, switch, archive, restore | Workspace lifecycle and active context |
| Opportunity actions | submit application, decision properties, contacts, task/note deletion | Connected Opportunity workflows |
| Interview actions | update and delete | Scheduled event, preparation, outcome, follow-up automation |
| URL capture | `importJobFromUrl()` | SSRF-safe fetch, ATS adapters, extraction, honest fallback |
| Workspace search | `search_roleway(query, project)` | Categorized Workspace-scoped entity search |
| Agent providers | `generateAssistantOutput()` and conversational provider seam | BYO-provider generation with validated drafts and bounded chat output |
| Observability | `recordSystemEvent()` | Redacted critical workflow errors for Admin → System |

These are deep modules at real seams. Do not add adapters or abstraction layers until behavior genuinely varies.

## Domain invariants

- An Account always has at least one non-archived Workspace.
- Career Profile facts are global; visual identity, focus, preferences, and the Opportunity ticket key are Workspace-specific.
- Each Workspace owns one account-unique, configurable 2–10 character ticket key used to display Opportunity identifiers; changing the key does not change Opportunity identity or history.
- Jobs, Opportunities, tasks, interviews, contacts, documents, applications, and notification records cannot cross Workspaces; account-wide surfaces may aggregate those owned records without changing their Workspace ownership.
- One owner can track a Job at most once.
- Opportunity stage changes are non-linear so an existing application can be captured late.
- Closed Opportunities require a structured outcome.
- Every application record preserves submission time, channel, confirmation, and selected documents where provided.
- Document saves create append-only version snapshots.
- Scheduling an interview creates one preparation task, moves eligible Opportunities to Interview, records an event, and emits one useful notification.
- Submitting an application creates a seven-day follow-up and moves the Opportunity to Applied.
- AI output is a draft. Read tools may inspect permitted context across the authenticated Account’s Workspaces. Every internal mutation resolves and rechecks one destination Workspace before explicit, durable Approval; external tools remain unavailable.

## Core routes

```text
/                          public product page
/login                     password login
/signup                    account creation
/forgot-password           recovery request
/reset-password            recovery session password update
/auth/callback              Supabase PKCE callback
/onboarding                profile + first Workspace
/home                     active-project action queue
/inbox                     active-Workspace Inbox
/opportunities             active-project List / Board
/opportunities/[id]        Opportunity dossier
/documents                  project documents
/documents/[id]             document editor and version history
/interview                 interviews
/interview/[id]            interview schedule, preparation, notes, outcome
/contacts                   project contacts and follow-ups
/agent                     account-wide Roleway Agent conversations, runs, drafts, and approvals
/insights                   account-wide, sample-aware analytics across Workspaces
/notifications              account-wide Notification Center with Workspace attribution
/settings/workspaces        create/switch/archive Workspaces
/settings/workspaces/[id]   dedicated Workspace settings overview
/settings/workspaces/[id]/general  Workspace identity, focus, preferences, and boundaries
/settings/*                 profile, notifications, appearance, AI, privacy
/admin                      role-protected admin product
/api/search                 authenticated entity search
/api/export                 private JSON export
```

Legacy `/inbox/new`, `/documents/new`, `/interview/new`, and `/settings/preferences` routes redirect into the current modal or settings flows.

## Capture architecture

Manual capture is always available. URL capture:

1. normalizes the URL and removes common tracking parameters;
2. rejects credentials, non-web schemes, non-standard ports, loopback/private DNS answers, oversized bodies, and excessive redirects;
3. consumes an authenticated 20-attempt/hour database quota;
4. uses fixed public ATS endpoints for Ashby, Greenhouse, and Lever;
5. otherwise reads JobPosting JSON-LD and observable metadata;
6. sanitizes rich text;
7. returns only fields the source exposed and asks the user to fill the rest;
8. warns on duplicate source URLs inside the Workspace.

A browser extension remains a future adapter. It must not bypass this normalization, provenance, quota, or privacy model.

## Security model

- Every user-owned table has RLS.
- Relationship policies and assignment triggers validate both owner and Workspace.
- Service-role access is confined to server-only modules for encrypted AI credentials, account deletion, E2E cleanup, and redacted system events.
- AI keys use AES-256-GCM and are never returned to the browser.
- Account deletion requires the exact account name/email and a fresh password verification.
- Admin authorization uses `admin_members` plus security-definer functions; UI checks are not the authorization mechanism.
- Admin role changes require an owner and write `admin_audit_logs`.
- Authenticated pages and API responses use `no-store`; the PWA caches static assets only.

## Analytics semantics

Insights are account-wide and calculated across owned Workspaces from real Jobs, application records, interviews, and outcomes. Conversion rates wait for at least three applications. Source results are shown as counts for small samples. The product does not claim causation or predict hiring outcomes.

## AI model

Roleway Agent is account-configured through user-supplied provider credentials and can read permitted context across all owned Workspaces. It is a native conversational work surface rather than a generic chat widget. The product workflow, tool tiers, approval states, and rollout are specified in [`ROLEWAY-AGENT.md`](ROLEWAY-AGENT.md). A conversation is account-owned and may optionally focus an Opportunity, Job, interview, contact, or document. Starting a new conversation creates a clean context boundary; proposed mutations still resolve one exact destination Workspace.

Every execution is a durable Agent Run. Runs record the selected context categories, provider/model, status, bounded step summaries, draft output, tool proposals, errors, and approvals. Secrets, raw prompts, stack traces, and unrelated record content are never stored in run metadata or system events.

Agent capabilities are tiered:

1. authenticated read tools search and summarize only records visible across the Account’s owned Workspaces;
2. draft tools prepare next actions, tasks, notes, questions, follow-ups, and document text without applying them;
3. internal mutation tools present an exact Approval card and execute only after explicit user approval and renewed server-side scope checks;
4. external actions—submitting applications, contacting employers, or scheduling external events—remain unavailable.

Provider output is untrusted input. Conversational text is bounded and sanitized; structured drafts and tool proposals are validated with shared Zod schemas. A user can cancel, retry, reject, edit, or approve. Applying a suggestion records the Approval and resulting domain event.

Provider connections and conversation history remain account-wide and encrypted with AES-256-GCM where applicable; resulting operational records remain Workspace-scoped. Consumer AI subscriptions are not treated as API authorization. Core Roleway tracking continues to work without AI.

## Testing and release gates

Required before release:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @roleway/web test:e2e
pnpm build
```

The E2E suite must use a disposable account and verify normal-user admin denial before temporarily granting test-only admin access. Browser validation covers desktop and mobile screenshots, keyboard controls, no horizontal overflow, console errors, and production-server behavior.

## Intentional future boundaries

- No unsupported job aggregation or scraping-based marketplace.
- No browser extension until permissions, privacy copy, ATS fallbacks, and review UX are complete.
- No email/calendar integration until token storage and failure recovery are designed.
- No generic workflow engine, automation builder, collaboration, billing, or team permissions in the individual product.
- No opaque fit score; future fit work must map requirements to user-approved evidence and distinguish facts from inference.
