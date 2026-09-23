# Roleway technology stack

This document records the technologies currently used to build, run, test, and deploy Roleway. Dependency versions are resolved in `pnpm-lock.yaml`; the workspace `package.json` files define the dependencies. For product behavior and ownership rules, see [`docs/PLANNING.md`](docs/PLANNING.md).

## Application platform

| Layer           | Technology         | Version / role                                                                          |
| --------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Runtime         | Node.js            | Node 22 in the Docker image; Node 24 in GitHub Actions                                  |
| Package manager | pnpm               | 10.12.1, with Corepack                                                                  |
| Monorepo tasks  | Turborepo          | 2.10.10 across `apps/*` and `packages/*`                                                |
| Language        | TypeScript         | 5.9.3, with strict checking                                                             |
| Web framework   | Next.js App Router | 16.3.3, Server Components, Server Actions, route handlers, and Turbopack in development |
| UI runtime      | React / React DOM  | 19.2.8                                                                                  |
| Hosting         | Vercel             | GitHub integration builds `apps/web`; the Dockerfile supports self-hosting              |

## Frontend

- **Tailwind CSS 4.3.3** through `@tailwindcss/postcss`, with Roleway's tokens and layout styles in `apps/web/src/app`.
- **Source-owned shadcn components** in `apps/web/src/components/ui`, using **Base UI 1.7.0** for accessible controls. Product components live alongside them in `apps/web/src/components`.
- **Lucide React 0.468.0** for icons; **Next Font** loads Inter and Geist Mono.
- **Sonner 2.0.8** for toast feedback, **Lenis 1.3.26** for landing-page scrolling, and **react-markdown 10.1.0** with **remark-gfm 4.0.1** for Agent messages.
- Light, dark, and system appearance use CSS tokens and a device-local preference.

## Backend and data

| Concern               | Technology / role                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Application backend   | Next.js Server Components, Server Actions, and route handlers                                                        |
| Database              | Supabase PostgreSQL, accessed through `@supabase/supabase-js` 2.112.3                                                |
| Schema and migrations | Forward SQL migrations in `supabase/migrations`; no parallel ORM schema                                              |
| Authentication        | Supabase Auth with `@supabase/ssr` 0.12.4 and cookie-backed sessions; password flows and optional Google OAuth       |
| Authorization         | PostgreSQL Row Level Security, relationship checks, protected functions, and Workspace-scoped server queries/actions |
| Validation            | Zod 3.25.76 in the web app and `packages/schemas`                                                                    |
| Rich text             | `sanitize-html` 2.17.7 before storing or rendering imported content                                                  |
| Auth email            | Supabase Auth templates and SMTP delivery through Resend; the Next.js runtime does not send directly through Resend  |
| Bot protection        | Cloudflare Turnstile on protected Auth flows                                                                         |
| Job capture           | Server-side URL fetching, fixed Ashby/Greenhouse/Lever adapters, and sanitized metadata fallback                     |

Documents and their versions are PostgreSQL records in the current application. The database source of truth and Workspace ownership model are described in [`docs/PLANNING.md`](docs/PLANNING.md); hosted email setup is in [`docs/AUTH_EMAIL.md`](docs/AUTH_EMAIL.md).

## Roleway Agent

- **Vercel AI SDK 7.0.109** and `@ai-sdk/react` 4.0.112 stream the chat response and progress through `POST /api/agent/chat`.
- Provider adapters use `@ai-sdk/openai` 4.0.72, `@ai-sdk/anthropic` 4.0.59, and `@ai-sdk/google` 4.0.76. Connections support OpenAI, Anthropic, Gemini, OpenRouter, and a validated OpenAI-compatible endpoint.
- User-supplied provider credentials are encrypted on the server. Output is validated against shared schemas, and internal changes require a separate, durable database approval. See [`docs/HOW_ROLEWAY_AGENT_WORKS.md`](docs/HOW_ROLEWAY_AGENT_WORKS.md) for the request flow and [`docs/ROLEWAY-AGENT.md`](docs/ROLEWAY-AGENT.md) for the behavior contract.

## Progressive Web App

- Next.js generates the installable manifest and icon metadata in `apps/web/src/app/manifest.ts`.
- The production service worker in `apps/web/public/sw.js` caches static branding assets and an offline fallback. Authenticated pages, APIs, and Next.js chunks remain network-managed.

## Quality and delivery

| Tool                | Version / purpose                                                                   |
| ------------------- | ----------------------------------------------------------------------------------- |
| ESLint              | 9.39.5 with `eslint-config-next` 16.3.3                                             |
| Prettier            | 3.9.6 for formatting                                                                |
| Vitest              | 3.2.7 for package and web unit tests                                                |
| Playwright          | 1.62.1 for browser journeys; `@axe-core/playwright` 4.13.0 for accessibility checks |
| TypeScript compiler | `tsc --noEmit` through Turborepo                                                    |
| GitHub Actions      | CI, manually dispatched browser journeys, and semantic-release 25.0.9 on `main`     |

The standard local checks are:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @roleway/web test:e2e
pnpm build
```

The browser suite needs a configured Supabase project and disposable test account. See [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md) and [`docs/DEPLOYMENT_AND_RELEASES.md`](docs/DEPLOYMENT_AND_RELEASES.md) for the PR, CI, migration, and release process.

## Repository structure

- `apps/web/src/app` — routes, layouts, Server Actions, and route handlers.
- `apps/web/src/features` — feature-owned workflows, including Agent, capture, and Opportunities.
- `apps/web/src/components` — shared product UI and source-owned controls.
- `apps/web/tests/e2e` — Playwright browser journeys.
- `packages/core` — shared workflow rules and labels.
- `packages/schemas` — shared Zod schemas.
- `supabase/migrations` — authoritative SQL schema, RLS policies, and database functions.
- `supabase/templates` — Auth email templates.
- `docs` — product, architecture, operations, and release guidance.
