# Roleway V1 Planning Artifacts

## 1. Product requirements

Roleway must let one authenticated owner establish approved career evidence, define preferences, ingest Jobs, triage them before tracking, and run tracked Opportunities through a controlled lifecycle. Every active Opportunity should expose one Next Action. AI output must be structured, grounded, inspectable, provider-neutral, and approval-gated according to tool risk. Non-AI tracking must work without a configured provider. V1 excludes external submission, email/calendar integrations, mass apply, teams, billing, extensions, and local subscription bridges.

Quality gates for every shipped flow: owner authorization, Zod validation, responsive states, keyboard and pointer access, useful empty/error/loading states, and behavior tests around consequential transitions.

## 2. Information architecture

- **Today** — interviews, due work, reviews, follow-ups, recommendations, stale work
- **Opportunities** — pipeline board and saved views
  - Opportunity — Overview, Application, Preparation, Research, Interviews, Activity
- **Jobs** — candidate inbox, import, manual creation
- **Documents** — resume bases/versions, focused documents, answer bank
- **Preparation** — upcoming interviews, plans, question bank, mock sessions
- **Insights** — goals and sufficiently-supported pipeline metrics
- **Agent** — contextual threads and durable runs
- **Settings** — Career Profile, Preferences, AI Providers, Privacy/Data

## 3. Route map

```text
/                         → /today
/auth/sign-in             → email + Google
/auth/recover             → account recovery
/today                    → command center
/opportunities            → Kanban
/opportunities/[id]       → opportunity workspace
/jobs                     → inbox
/jobs/import              → URL/paste/manual ingestion
/documents                → document workspace
/documents/resumes/[id]   → version/diff review
/preparation              → interview preparation
/preparation/[id]         → plan or mock session
/insights                 → pipeline metrics
/agent                    → threads and runs
/settings/profile         → Career Profile
/settings/preferences     → job preferences
/settings/ai              → providers, models, credentials
/settings/privacy         → export, deletion, telemetry
/api/jobs/import          → validated ingestion request
/api/webhooks/trigger     → signed background callbacks
```

## 4. Primary user flows

1. **First run:** authenticate → approve profile facts → set preferences → import first Job → inspect parsed snapshot.
2. **Triage:** enter Jobs inbox → J/K inspect → Track/Maybe/Dismiss → Track creates Opportunity and event.
3. **Apply:** inspect Fit Analysis and evidence → prepare application → review proposed plan/tasks/resume version → approve individually → submit externally → mark Applied and schedule follow-up.
4. **Interview:** add event → preparation plan runs in background → complete topics/practice → hold interview → record outcome and Next Action.
5. **Close:** move to Offer or Closed → record structured outcome → preserve timeline and artifacts.

## 5. Domain model

A Job owns immutable Job Snapshots and normalized Job Requirements. Tracking a Job creates one owner-scoped Opportunity with a Stage and append-only Opportunity Events. Tasks, notes, contacts, application records, interviews, research, documents, and Agent Runs attach to the Opportunity. Career Profile entities are the only approved factual evidence. Resume Bases select profile evidence; Resume Versions are immutable revisions. Fit Analyses compare a snapshot of requirements/preferences/evidence, preserving the inputs that produced the result. See `CONTEXT.md` for canonical language.

Key invariants:
- Job and Opportunity are distinct; at most one active Opportunity per owner/Job pair.
- Closed Opportunities require a Closed Outcome.
- External actions always require a pending Approval and explicit user execution.
- Generated claims reference Career Evidence or are marked as unsupported and cannot be approved.
- Historical snapshots, submitted resume versions, and activity events are immutable.

## 6. Database schema

PostgreSQL/Supabase with Drizzle. All owner data carries `user_id`; high-volume queries index `(user_id, created_at)` and route-specific fields. Major clusters:

- identity: `users`, `profiles`, `career_preferences`
- evidence: `experiences`, `projects`, `skills`, `education`, `certifications`, `achievements`
- discovery: `job_sources`, `jobs`, `job_snapshots`, `job_requirements`
- workflow: `opportunity_stages`, `opportunities`, `opportunity_events`, `opportunity_notes`, `tasks`, `application_records`, `application_answers`
- content: `resume_bases`, `resume_versions`, `resume_sections`, `documents`, `document_versions`
- relationships/prep: `contacts`, `contact_events`, `interviews`, `interview_sessions`, `questions`, `practice_answers`
- provenance: `research_items`, `research_sources`
- system: `notifications`, `ai_providers`, `ai_configs`, `agent_threads`, `agent_messages`, `agent_runs`, `agent_steps`, `tool_calls`, `approvals`

Use partial indexes for open Opportunities and incomplete due Tasks, GIN for Job/document full-text search, optional vector columns only for evidence/answer retrieval, check constraints for enums, and unique owner-scoped keys. Private Storage objects live under `{user_id}/...` and are accessed with signed URLs.

## 7. Authorization matrix

| Resource/action | Owner | Background worker | Other user | Anonymous |
|---|---:|---:|---:|---:|
| Read/write profile and preferences | yes | scoped read | no | no |
| Read/write Jobs and Opportunities | yes | scoped by signed run | no | no |
| Read private documents | yes | scoped by run purpose | no | no |
| Mutate stage/tasks/notes | yes | approved internal-write policy | no | no |
| Execute external action | explicit approval only | never in V1 | no | no |
| Read AI credential plaintext | never after save | provider adapter only | no | no |
| Export/delete account | yes + re-auth | no | no | no |

Server Actions and Route Handlers authenticate and authorize independently. Supabase RLS mirrors owner rules as defense in depth. Trigger.dev jobs receive resource IDs and re-resolve owner-scoped context; no serialized whole-user context.

## 8. AI tool permission matrix

| Class | Tools | Default |
|---|---|---|
| Read-only | `read_job`, `read_profile`, `read_resume`, `get_opportunity`, `search_jobs`, `research_company` | run; show context manifest |
| Internal write | `create_task`, `create_note`, `create_document_draft`, `update_fit_analysis` | policy-controlled; log event |
| Reviewable artifact | `create_resume_version`, `create_application_plan`, `create_preparation_plan` | stage proposal; approval before adoption |
| External | `send_email`, `submit_application`, `message_contact`, `schedule_event` | explicit per-action approval; not implemented V1 |

All arguments use discriminated Zod schemas; dispatch is an allow-list keyed by tool name. Tools receive an immutable owner/opportunity execution context, never arbitrary IDs from model output.

## 9. Provider architecture

`packages/ai` exposes one deep `generateStructured(task, context, schema)` interface and a streaming conversational interface. Provider adapters cover OpenAI, Anthropic, Gemini, OpenRouter, Ollama, and custom OpenAI-compatible endpoints. Product code chooses a capability slot (`fast`, `reasoning`, `agent`, `embedding`), never a vendor model. The provider registry resolves user config, decrypts credentials server-side, produces a redacted request manifest, validates output with Zod, and records usage. Environment credentials are optional self-host overrides. A future local runner satisfies a separate execution adapter and cannot expose consumer subscription credentials.

## 10. Component architecture

- Server layouts/pages own data loading and authorization.
- Feature modules own queries, schemas, actions, and route-specific views.
- Client islands are limited to Kanban interaction, keyboard scopes, command palette, diff review, mock session, and agent streaming.
- Shared UI contains primitives (button, input, dialog, tabs, status, skeleton), not domain composites.
- `AppShell` owns desktop/mobile navigation and global commands; `OpportunityWorkspace` composes tab content with `ContextPanel`; `AgentPanel` receives page context as a typed manifest.

Module seams are intentionally placed at job-source normalization, provider generation, tool execution, resume rendering, and background dispatch because each has multiple real adapters.

## 11. Design system

See `DESIGN.md`. Restrained pure-white/cool-neutral system, moss action color, compact single-family typography, 224px desktop rail, structural dividers, and minimal shadow. Signature action lines join deadline, state, and Next Action. Dark mode is token-driven. Components include all interactive states; drag actions have accessible menus; reduced motion is mandatory.

## 12. Milestone plan

1. **Foundation:** monorepo, shell, strict config, schema, auth seams, tokens.
2. **Evidence:** Career Profile and preferences with owner-scoped validation.
3. **Discovery:** URL/paste/manual Jobs, snapshots, Inbox, Track transition.
4. **Workflow:** Kanban, Opportunity workspace, tasks/events, Today.
5. **AI foundation:** providers, encrypted BYOK, context manifests, tools/runs/approvals, Trigger.dev dispatch.
6. **Intelligence:** requirements, evidence-linked Fit Analysis, application plans.
7. **Documents:** resume bases/versions/diffs/PDF, answer bank.
8. **Research & preparation:** sourced research, contacts, interviews, plans, questions, mock reviews.
9. **Completion:** insights, notifications, privacy/export/delete, Docker, MCP seam, accessibility/performance/browser test pass.

Each milestone ends with unit/integration tests, a Playwright primary-flow check, keyboard/mobile review, authorization checks, and removal of abstractions that have only one hypothetical adapter.
