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

Product and architecture decisions are captured in [`PRODUCT.md`](PRODUCT.md), [`DESIGN.md`](DESIGN.md), [`CONTEXT.md`](CONTEXT.md), and [`docs/PLANNING.md`](docs/PLANNING.md).

## Start locally

```bash
corepack enable
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm install
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm dev
```

Open http://localhost:3003. The current product slice includes the responsive shell, Today command center, keyboard-operable Jobs inbox, Opportunity Kanban, full Opportunity workspace, Documents, Preparation, Insights, contextual Agent run, profile/preferences, provider configuration, dark mode, command palette, domain schemas, and core permission/transition tests.

## Environment

Copy `.env.example` to `.env.local`. Non-AI tracking is designed to work with no AI provider. Provider credentials remain server-only; production adapters must encrypt them with `CREDENTIAL_ENCRYPTION_KEY` and return only a redacted fingerprint.

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Self-hosting

`docker compose up` starts PostgreSQL and the web application. For production, use Supabase PostgreSQL/Auth/Storage or self-hosted Supabase, apply Drizzle migrations, terminate TLS in front of the web service, and supply secrets through your deployment environment.

## Security posture

All private resources are owner-scoped server-side and should be mirrored by Supabase RLS. Agent tools dispatch from an allow-list with validated arguments. External actions are not implemented in V1 and are modeled as always requiring explicit approval. Never expose service-role or provider keys to browser bundles.

## License

Apache-2.0 (license file to be added before public release).
