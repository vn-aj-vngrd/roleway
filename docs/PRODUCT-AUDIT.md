# Roleway Production Audit

_Audit refreshed: August 26, 2026. Scope: current working tree and applied Supabase migrations through `20260826140000`._

## Release scorecard

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Product usefulness | 9/10 | Multiple Workspaces, active Home queue, Job triage, connected Opportunity dossier, submissions, people, interviews, documents, and outcomes form one operating loop. |
| Workflow completeness | 8.5/10 | Discover/capture → triage → prepare → apply → follow up → interview is complete. External discovery aggregation and browser autofill are deliberate future adapters. |
| Information architecture | 9/10 | Account-wide Career Profile and project-scoped operational data are explicit in navigation, RLS, search, export, analytics, and admin metrics. |
| UX clarity and speed | 9/10 | List-first Opportunities, project switcher, quick capture, command search, predictable automations, and contextual empty/error states. |
| Accessibility | 9/10 | WCAG 2.2 AA-tagged axe checks pass for public landing and authenticated Home; Opportunity was separately axe-checked. Keyboard stage changes and pointer alternatives exist. |
| Responsive quality | 9/10 | 1440×1000 and 390×844 production views have no horizontal overflow; mobile preserves project switching and every core action. |
| Engineering | 8.5/10 | Supabase is the single schema source, project context is centralized, mutations are owner/project scoped, pure logic is unit-tested, dead packages were removed. |
| Security and privacy | 9/10 | RLS relationship checks, direct cross-owner E2E attacks, admin database authorization, SSRF controls, capture quota, encrypted AI keys, export, password-reverified deletion. |
| Reliability and observability | 8.5/10 | Intentional loading/error states, redacted system events, database-backed Admin health, AI failure records, audit logs, and production build/browser checks. |
| Production readiness | 9/10 | Auth, onboarding, projects, core workflows, admin denial, migrations, tests, production build, and real-browser validation pass. |

## Verified release paths

### Acquisition and account

- Public page states the Workspace differentiator and only advertises implemented behavior.
- Signup creates an authenticated session and a default project; onboarding atomically configures the profile and first Workspace.
- Login preserves same-origin deep links.
- Forgot-password, PKCE callback, reset-password, sign-out, expired-session routing, export, and password-reverified account deletion are implemented.

### Workspaces

- Create, configure, switch, archive, and restore work.
- Jobs, Opportunities, tasks, contacts, interviews, documents, applications, notifications, search, Home, and Insights use active `project_id` scope.
- Existing users and records were backfilled without losing data.
- A direct cross-user read returns no rows; a cross-owner task relationship insert is rejected by RLS.

### Capture and triage

- Manual capture works from any primary app surface.
- URL capture blocks private/loopback addresses, credentials, non-web schemes, non-standard ports, oversized responses, and redirect abuse.
- Ashby, Greenhouse, and Lever use fixed public job-board endpoints; generic pages use JobPosting JSON-LD/metadata.
- Missing company/title/description is disclosed rather than inferred. Duplicate URLs warn within the project.
- Capture is authenticated and limited to 20 attempts per user per hour.
- Inbox track/maybe/dismiss states are persisted; tracking is idempotent.

### Opportunity dossier

- Dense List and Board projections use the same records; Board has select/keyboard alternatives to drag.
- Status, priority, excitement, deadline, listing details, and one next action are editable.
- Application submission records channel, confirmation, salary response, portfolio, and exact immutable document versions where selected.
- Tasks and notes can be created, completed, reopened, and deleted.
- Contacts record relationship, details, notes, and follow-up; create/edit/delete works and follow-ups surface on Home.
- Interviews record schedule, IANA timezone, meeting, people, preparation, questions, post-interview notes, status, and outcome.
- Document saves append version snapshots and preserve project/opportunity association.
- Activity merges notes and consequential events into one timeline.

### Active assistance

- Home orders due tasks, contact follow-ups, interviews, next actions, and Inbox review without duplicate automation work.
- Application submission creates a seven-day follow-up.
- Interview scheduling creates one preparation task and one useful notification, and moves eligible work to Interview.
- Entity search covers active-project Opportunities, Jobs, documents, contacts, interviews, and notes.
- Insights uses real application/interview data, waits for a minimum sample before rates, and avoids causal language.

### Administration

- `admin_members` and protected database functions authorize; route hiding is not relied upon.
- Normal users are redirected from Admin.
- Overview, searchable Users, System, and Audit sections use real data.
- Owners can change admin roles; the final owner is protected and changes are audited.
- System health reports database reachability, redacted application errors, AI failures, provider connection failures, notifications, interviews, and admin actions.

## Automated evidence

```text
TypeScript: pass
ESLint: pass
Vitest: 30 tests across core and web (current count may increase)
Playwright: 5 serial critical-path tests
Supabase migration history: local and remote aligned
Next.js production build: pass
Axe: no serious/critical WCAG-tagged violations on audited release surfaces
Production browser: no console errors, no failed critical requests, CLS 0, authenticated Home LCP < 1s in local production run
Live deployment: `https://roleway.vercel.app` aliased to a READY Vercel production deployment and smoke-tested at 390px
```

## Deliberate exclusions—not placeholders

These are absent from navigation and public claims:

- unsupported job aggregation or a proprietary job marketplace;
- browser extension and application autofill;
- background auto-apply or recruiter outreach;
- email/calendar integration;
- binary file upload/PDF rendering;
- generic workflow/automation builder;
- collaboration, billing, or team permissions;
- opaque fit or hireability scores.

The architecture leaves legitimate seams for job-source, browser-companion, storage, and calendar adapters without shipping half-working controls.

## Remaining lower-priority risks

1. Email delivery for recovery links depends on deployment-specific Supabase SMTP configuration and must be smoke-tested after changing providers or domains.
2. Generic URL extraction quality varies by source; the honest manual fallback remains required even with supported ATS adapters.
3. Board renders up to 1,000 Opportunities. List rows use compact rendering, but a future high-volume profile should add cursor pagination/virtualization before raising this limit.
4. Analytics are intentionally directional. Resume/source comparisons remain counts until larger samples justify stronger presentation.
5. The initial admin owner email is a deployment bootstrap in SQL. Forks must replace it before first production signup.

None of these risks creates fake functionality or blocks the current individual, selective-search release model.
