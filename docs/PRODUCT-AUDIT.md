# Roleway Product Audit

_Audit baseline: August 2026, commit `f9724ed` plus the Roleway logo. This is the pre-hardening baseline used for the current improvement pass._

## Audit health score

| # | Dimension | Score | Key finding |
|---|---|---:|---|
| 1 | Accessibility | 2/4 | Good semantic intent, but touch targets, async feedback, skip navigation, and focus/error handling are incomplete. |
| 2 | Performance | 3/4 | Server Components and parallel queries are strong; unpaginated boards and broad client shell remain risks. |
| 3 | Responsive design | 2/4 | Mobile navigation and reflow exist, but dense workspace/board controls and sub-44px controls need hardening. |
| 4 | Theming | 3/4 | Consistent OKLCH tokens and deliberate dark mode; inline layout values and fixed external SVG colors are limited exceptions. |
| 5 | Anti-patterns | 3/4 | Calm and restrained overall; repeated card-like empty states and exposed unavailable AI features weaken product credibility. |
| **Total** |  | **13/20** | **Acceptable—significant product hardening required before market release.** |

## Anti-pattern verdict

**Pass with reservations.** The product does not look like an AI dashboard template: it avoids gradients, glass, oversized metrics, and decorative AI treatment. The credibility problem is functional rather than stylistic: Documents can be created but not opened, AI is exposed but unavailable, privacy controls describe missing export/deletion, and many mutations fail silently.

## Executive summary

- **P0:** Documents route creates dead-end records; no public landing page means the acquisition journey does not exist.
- **P1:** Server Actions silently discard invalid input and database failures; buttons provide no pending protection; stage closure stores a placeholder reason; destructive operations and account data controls are absent.
- **P1 security:** child-resource RLS checks `user_id` but does not prove the referenced Opportunity belongs to the same owner, allowing cross-owner associations if a UUID is known.
- **P1 reliability:** no practical browser tests cover authentication, onboarding, RLS-backed mutations, direct links, or logout.
- **P2:** no pagination, job editing, interview editing/deletion, note/task deletion, or accessible board keyboard workflow.

## Detailed findings

### P0

**Public acquisition flow is absent**  
Location: `apps/web/src/app/page.tsx`  
Impact: anonymous visitors are redirected into authentication without understanding the product or trust model.  
Recommendation: add a focused public page with real product representation, direct signup/login paths, privacy/open-source trust signals, and no fabricated proof.

**Documents are dead-end records**  
Location: `apps/web/src/app/(app)/documents/page.tsx`  
Impact: users can create a document but cannot open, edit, associate, export, or delete it. This is a placebo feature.  
Recommendation: implement focused document editing and protected deletion or remove Documents from navigation.

### P1

**Mutations fail silently**  
Location: `apps/web/src/features/workspace/actions.ts`  
Impact: invalid IDs, Zod failures, and Supabase errors often return nothing; users cannot know whether work was saved.  
Recommendation: use typed action results or explicit redirect messages, log redacted server errors, and expose recoverable UI errors.

**Duplicate submissions are easy**  
Location: all Server Action forms  
Impact: no pending state disables repeat clicks; duplicate notes/tasks/interviews can be created on slow connections.  
Recommendation: shared `SubmitButton` using `useFormStatus`, plus database idempotency where consequences are material.

**Stage semantics are not enforced**  
Location: `updateOpportunityStage` and `opportunities` UI  
Impact: callers bypass domain transitions and closing always records “Closed by user,” destroying insight quality.  
Recommendation: validate transitions centrally and collect a real closed reason.

**Cross-owner relationship integrity is incomplete**  
Location: `supabase/migrations/20260817140000_roleway_foundation.sql` child policies  
Impact: RLS owns the child row but does not validate ownership of referenced Opportunity IDs.  
Recommendation: add `EXISTS` checks for tasks, notes, events, interviews, and Opportunity-linked documents.

**Auth does not preserve intended deep links**  
Location: authenticated layout and login actions  
Impact: an expired user following an Opportunity URL lands on Today after login.  
Recommendation: carry a validated same-origin `next` path through login.

**No critical browser coverage**  
Location: test configuration  
Impact: deployments can regress signup, onboarding, RLS mutations, or logout without detection.  
Recommendation: Playwright serial E2E with disposable Supabase users and reliable cleanup.

### P2

- `apps/web/src/components/app-shell.tsx`: unavailable Agent/AI surfaces are promoted as finished navigation.
- `apps/web/src/app/(app)/opportunities/page.tsx`: board loads every record and stage changes require select plus a separate tiny Move button.
- `apps/web/src/app/(app)/opportunities/[id]/page.tsx`: giant component mixes querying, formatting, and four workflows; errors from secondary queries appear as empty data.
- `apps/web/src/app/(app)/today/page.tsx`: server-local time determines greeting and deadlines; dates are not consistently formatted with shared `Intl` utilities.
- `apps/web/src/app/globals.css`: desktop controls are frequently 27–34px with no touch-specific 44px override.
- Root layout lacks a skip link and theme-color metadata.
- Forms lack pending announcements, inline field errors, and unsaved-change protection.
- Jobs, tasks, notes, interviews, and documents lack protected deletion or undo.
- No pagination/search for growing pipelines.

## Systemic issues

1. **Action contract drift:** every form invents its own redirect/silent-return behavior.
2. **Feature exposure exceeds completion:** navigation advertises surfaces before their core loop is usable.
3. **Domain rules split across UI and SQL:** stage rules, closure outcomes, and relationship ownership are not enforced at one reliable seam.
4. **Responsive styling is visual, not interaction-complete:** layout reflows, but touch size and dense controls remain desktop assumptions.

## Positive findings

- Job and Opportunity are correctly separated in both language and storage.
- Authenticated layouts call `getUser`, Server Actions re-authenticate, and core tables use RLS.
- Independent Today queries run in parallel.
- The restrained OKLCH token system, typography, dark mode, reduced-motion rule, and route monogram form a coherent visual identity.
- Onboarding is short, preference-led, and now proceeds directly from password signup.
- Empty states explain the model rather than showing blank pages.

## Recommended action sequence

1. **P0 — harden:** complete or hide dead-end features; add public acquisition flow.
2. **P1 — harden:** normalize mutation feedback, pending states, authorization, and destructive confirmation.
3. **P1 — audit:** add and run critical Playwright paths and database-policy checks.
4. **P2 — adapt:** verify touch sizing and dense workflows at 390px, 768px, and desktop.
5. **P2 — polish:** final hierarchy, copy, spacing, loading, and interaction-state pass.
