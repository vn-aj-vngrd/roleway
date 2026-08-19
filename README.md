# Roleway

**Run your job search like a project.**

Roleway is an open-source, self-hostable job hunt operating system. It separates discovered Jobs from tracked Opportunities, keeps every application artifact and event in context, and uses explainable, approval-gated AI to prepare work without taking control.

**Live application:** [roleway.vercel.app](https://roleway.vercel.app)

## Repository

```text
apps/web       Next.js App Router product
packages/core  Domain transitions and tool permissions
packages/schemas Zod boundary and AI-output schemas
packages/db    PostgreSQL schema via Drizzle
packages/ai    Provider-neutral AI seam
packages/ui    Shared primitives as they earn reuse
packages/config Typed server environment
```

Product and architecture decisions are captured in [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md), [`CONTEXT.md`](CONTEXT.md), and [`docs/PLANNING.md`](docs/PLANNING.md). The current quality baseline and market research live in [`docs/PRODUCT-AUDIT.md`](docs/PRODUCT-AUDIT.md) and [`docs/COMPETITIVE-ASSESSMENT.md`](docs/COMPETITIVE-ASSESSMENT.md).

## Start locally

```bash
corepack enable
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm install
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm dev
```

Open http://localhost:3003. Create an account with email and password and the session starts immediately—no magic link or email delivery. Complete the short profile-and-preferences setup, follow the optional four-step product tour, then add Jobs and track them as Opportunities. Today, pipeline stages, next actions, tasks, notes, interviews, documents, profile settings, preferences, and insights all read and write the authenticated user's Supabase data.

## Environment

Copy `.env.example` to `apps/web/.env.local` and provide the Supabase URL and anon key. Link the Supabase CLI and run `supabase db push` to apply the migrations. Non-AI tracking works without an AI provider; unconfigured AI surfaces show an honest empty state rather than generated sample output.

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm --filter @roleway/web test:e2e
pnpm lint
pnpm build
```

## Self-hosting

The production application uses Supabase PostgreSQL and password-based Auth. Apply `supabase/migrations`, configure the production Site URL, terminate TLS in front of the web service, and supply secrets through the deployment environment. The included Docker Compose file remains useful for PostgreSQL development, but Supabase Auth is required for the current application flow.

## Security posture

Every workspace table enforces ownership through Supabase Row Level Security, while Server Actions independently authenticate the caller and constrain mutations by `user_id`. Sessions use HttpOnly Supabase cookies refreshed by middleware. The service-role and provider keys are never imported by browser code.

## License

Apache-2.0 (license file to be added before public release).
