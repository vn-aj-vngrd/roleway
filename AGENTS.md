# Roleway Agent Guide

## Start

1. Read `CONTEXT.md` before changing domain language.
2. Read `docs/PLANNING.md` before changing architecture, data scope, auth, capture, AI, or admin behavior.
3. Inspect `git status` and preserve inherited staged, unstaged, and untracked work.
4. Run the affected workflow in a browser; filenames are not product evidence.

A step is complete when its relevant tests pass and the real workflow has no console error, horizontal overflow, dead action, or ambiguous recovery state.

## Product model

`Account → Workspace → Job → Opportunity → application, tasks, interviews, contacts, documents, activity`

- One Workspace equals one focused job search. Career Profile is account-wide; strategy and operational records are workspace-scoped.
- Job is discovered listing data. Opportunity is tracked work. Keep the terms distinct.
- Active work must answer “what happens next?” through one Next Action or a job-search-specific task.
- Stage changes are non-linear because users may capture work late. Closing requires an outcome.
- AI prepares reviewable drafts. Users execute every external action.

## Architecture

- `supabase/migrations` is the only database source of truth. Add a forward migration; preserve existing data.
- `requireSearchContext()` is the legacy-named server seam for auth plus active-Workspace scope.
- Pages store Workspace ownership in `project_id`; Server Actions filter again; RLS and relationship triggers are defense in depth.
- Keep Server Components as the default. Add client islands only for interaction that needs browser state.
- Shared workflow rules live in `packages/core`; shared schemas live in `packages/schemas`.
- Add a module seam only when behavior varies or several callers need the hidden complexity.

When adding a Workspace-owned relation, account for all four: migration/backfill, assignment trigger, RLS relationship check, and export/search/admin implications.

## Security

- Service-role, database, AI, and auth secrets stay in server-only modules and environment files.
- URL fetching must retain DNS/private-address checks, fixed ATS hosts, size/redirect/time limits, sanitization, duplicate checks, and quota consumption.
- Rich text is sanitized before storage and display.
- Admin UI visibility is convenience; `admin_members` and protected database functions authorize.
- Record redacted error codes through `recordSystemEvent()`. Never store prompts, credentials, job descriptions, emails, or stack traces in system event metadata.

## Interface

Read `DESIGN.md` before UI work. Preserve the Focused Dossier and Waypoint Rail:

- one flush work plane, quiet sidebar, subtle rules, compact controls;
- Waypoint Blue for forward action, focus, selection, and progress;
- List is the default Opportunity view; Board is a secondary stage-manipulation view;
- Opportunity content reads as a dossier, not a card grid;
- desktop and mobile keep Workspace switching, Home, capture, status, notes, tasks, and preparation usable;
- pointer, keyboard, and touch paths are peers. Dragging is never the sole status control.

Public claims must map to implemented behavior. Demonstration records may be illustrative; metrics, customers, outcomes, integrations, and pricing may not be invented.

## Verification

Run the narrow test while iterating, then finish with:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @roleway/web test:e2e
pnpm build
```

The E2E suite uses the configured Supabase project and creates a disposable account. Keep cleanup intact. Validate both 1440px desktop and 390px mobile in a real browser, inspect console/network failures, and test normal-user denial before admin access.

Generated `.next`, `.turbo`, Playwright traces, auth state, and browser recordings are not product source. Never commit credentials or reusable browser state.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This app uses Next.js 16.3. Read the relevant version-matched guide in `apps/web/node_modules/next/dist/docs/` before changing Next.js code; APIs, conventions, and file structure may differ from training data. Heed deprecation notices.

This block is managed by `next dev`; keep project-specific instructions outside these markers.

<!-- END:nextjs-agent-rules -->
