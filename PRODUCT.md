# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Roleway is for individual job seekers running an active, selective search over weeks or months. They may be employed, between roles, or changing careers. They need one dependable place to decide which jobs deserve effort, prepare strong applications, remember follow-ups, and move each serious opportunity forward without optimizing for application volume.

## Product Purpose

Roleway gives each focused job search its own Workspace. It separates different targets, then connects discovery, evaluation, application work, people, follow-up, interviews, documents, and outcomes around a durable Opportunity so the user can always answer, “What should I do next?”

Success means fewer dropped follow-ups, stronger evidence-based applications, complete context when preparing or interviewing, and clear user ownership of every external action.

## Positioning

Roleway is a calm operating system for a selective job search: every tracked Opportunity keeps one next action and its complete working context together, while optional AI prepares reviewable work without applying, contacting employers, or taking control.

Unlike high-volume trackers, auto-apply products, and disconnected resume tools, Roleway is organized around deliberate progress on serious opportunities. It remains useful with AI disabled.

## Operating Context

A typical workflow is:

1. Open or create the Workspace for this career target.
2. Save a discovered Job with its source, description, requirements, compensation, and location.
3. Review it in the Workspace Inbox before deciding whether to track it.
4. Track it as an Opportunity with a stage, next action, priority, and due date.
5. Keep the submission record, tasks, notes, contacts, documents, interviews, preparation, and history with that Opportunity.
6. Start each day from the Workspace’s Home view, which surfaces due work, follow-ups, interviews, and Jobs awaiting review.
7. Ask the optional Roleway Agent about the active Workspace or request grounded preparation, then review drafts and explicitly approve any internal change.
8. Move the Opportunity through its lifecycle and retain the outcome history and Workspace-level results.

Users work primarily at a desktop during focused planning and preparation, while the responsive web app and installable PWA preserve essential tracking and Home workflows on mobile.

## Capabilities and Constraints

- An Account can own multiple Workspaces with independent preferences, Jobs, Opportunities, documents, people, goals, notifications, and analytics.
- Jobs and Opportunities are distinct. A Job is discovered information inside one Workspace; tracking it creates one owner-scoped Opportunity in that Workspace.
- Every active Opportunity can expose one concrete next action and due date.
- The application supports Home, Workspace Inbox, list and board pipeline views, rich Opportunity dossiers, application records, tasks, notes, document versions, contacts, interviews, preparation, entity search, notifications, settings, analytics, export/deletion, and a data-backed admin console.
- Core tracking works without an AI provider.
- Roleway Agent is optional and provider-neutral. Users supply a supported provider connection; credentials are encrypted server-side.
- Agent answers and drafts must be grounded in disclosed active-Workspace context and validated before display. Internal mutations require exact, durable Approval; external actions remain unavailable.
- Users approve consequential changes and own every external action.
- Roleway does not submit applications, contact employers, mass apply, or run background submission.
- Job URL capture supports public Ashby, Greenhouse, and Lever endpoints plus JSON-LD/metadata fallbacks; missing fields are never fabricated.
- The current product has no teams, billing, browser extension, email/calendar integration, external job aggregation, or consumer-AI-subscription bridge.
- Authenticated data is owner-scoped through Supabase Row Level Security and independently authorized server mutations.
- The PWA caches only versioned static assets; authenticated pages and API responses remain network-only.

## Brand Commitments

- The product name is **Roleway**.
- The voice is focused, calm, exact, and direct. It explains what the user can do without motivational filler or inflated claims.
- The product must not present itself as a mass auto-apply bot, CRM template, generic project board, resume funnel, or AI-chat wrapper.
- Roleway is open source and self-hostable as durable secondary commitments; the selective-search workflow remains the primary promise.
- The Roleway mark is an R drawn as a route ending in a waypoint, representing the next action.
- Linear, GitHub, Raycast, Arc, and Apple are interaction and craft references only. Roleway must not copy their visual identity.

## Evidence on Hand

- The working product and real HTML product previews in `apps/web` demonstrate the primary workflow.
- Domain rules and transitions live in `packages/core`; boundary and AI-output schemas live in `packages/schemas`.
- PostgreSQL/Supabase migrations in `supabase/migrations` document the implemented owner-scoped data model.
- `docs/PLANNING.md` records the V1 workflow, canonical entities, AI permission model, and exclusions.
- `docs/COMPETITIVE-ASSESSMENT.md` contains sourced market research and the selective-search position.
- `docs/PRODUCT-AUDIT.md` records the product-quality baseline and known hardening work.
- `docs/AI-PROVIDER-INTEGRATION.md` documents supported provider behavior and security decisions.
- `docs/LINEAR-DESIGN-SYSTEM-AUDIT.md` and `docs/LINEAR-COMPONENT-CATALOG.md` record primary-source and authenticated-product design research used for the current interface direction.
- `docs/ROLEWAY-AGENT.md` specifies the native conversational Agent, BYO-provider boundary, tools, approvals, and rollout.
- The canonical live deployment is `https://roleway.vanajvanguardia.tech`; the legacy `roleway.vercel.app` hostname permanently redirects to it.
- There are no approved testimonials, customer logos, usage metrics, outcome claims, pricing claims, or press assets. Future work must not fabricate them.
- The repository includes an Apache-2.0 `LICENSE` file.

## Product Principles

1. **The next action leads.** Active work resolves to a clear, concrete Next Action instead of a passive status.
2. **Complete context beats feature inventory.** Tools and artifacts stay with the Opportunity that gives them meaning.
3. **Selective progress beats application volume.** Roleway helps users invest in serious opportunities rather than maximize submissions.
4. **Evidence beats opaque scores.** Requirements, sources, gaps, and approved career evidence remain inspectable.
5. **Prepare, then approve.** AI prepares internal work; users review consequential changes and own every external action.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Primary flows must work with keyboard and pointer, focus must remain visible, drag-and-drop must have button and keyboard alternatives, and status must never depend on color alone. Dialogs manage focus, motion respects reduced-motion preferences, and mobile preserves Home, status changes, notes, tasks, and preparation workflows.
