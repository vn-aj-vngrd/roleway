# Roleway

**Give every focused job search its own Workspace.**

Roleway is an open-source, self-hostable operating system for focused job searches. An Account owns a global Career Profile and multiple Workspaces; each Workspace keeps its own preferences, Inbox, Opportunities, documents, people, interviews, goals, notifications, and analytics.

The product is useful without AI. Optional Roleway Agent answers questions from selected Workspace context, prepares reviewable work, and applies internal changes only after explicit approval. It never submits applications or contacts employers.

## Repository

```text
apps/web         Next.js App Router product, server actions, Supabase adapters, UI
packages/core    Shared workflow rules and labels
packages/schemas Shared Zod domain schemas
supabase         Authoritative PostgreSQL schema, RLS policies, functions, indexes
```

Supabase migrations are the database source of truth. There is no parallel ORM schema.

Core product and design decisions live in [`PRODUCT.md`](PRODUCT.md), [`CONTEXT.md`](CONTEXT.md), [`DESIGN.md`](DESIGN.md), and [`docs/adr`](docs/adr). Current market research is in [`docs/COMPETITIVE-ASSESSMENT.md`](docs/COMPETITIVE-ASSESSMENT.md).

## Run locally

```bash
corepack enable
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm install
cp .env.example apps/web/.env.local
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm dev
```

Open <http://localhost:3003>.

The application requires a Supabase project with password authentication. Link the Supabase CLI and apply every migration:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser/server user-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Account deletion, encrypted AI connections, redacted system events, E2E cleanup |
| `NEXT_PUBLIC_SITE_URL` | yes | Auth recovery callback origin |
| `AI_CREDENTIAL_ENCRYPTION_KEY` | for Agent | Base64-encoded 32-byte AES key |
| `DATABASE_URL` | tooling | Direct PostgreSQL migration/lint access |

Never expose the service-role or encryption key to browser code. Core tracking works when Agent is unconfigured.

Generate the AI encryption key with:

```bash
openssl rand -base64 32
```

## Product model

```text
Account
├── Career Profile
└── Workspace
    ├── preferences and goals
    ├── Job Inbox
    └── Opportunity
        ├── application record
        ├── tasks and next action
        ├── interviews and preparation
        ├── contacts and follow-ups
        ├── documents and versions
        └── activity history
```

Jobs are discovered listing data. Tracking a Job creates one Opportunity in the same Workspace. Stage changes are intentionally non-linear because users may capture an existing application late; closing always requires an outcome.

Public job URLs are fetched server-side with private-network blocking, redirect and size limits, and a per-user quota. Ashby, Greenhouse, and Lever use their public job-board endpoints; other pages fall back to observable JSON-LD and metadata. Missing fields remain missing for the user to review.

## Quality commands

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @roleway/web test:e2e
pnpm build
```

The Playwright suite creates and removes a disposable Supabase account. It covers signup, onboarding, Workspaces, capture, Opportunity progression, application recording, documents, interviews, Home, entity search, export, admin authorization, sign-out protection, and account deletion.

## Security and privacy

- Supabase Auth sessions use HttpOnly cookies refreshed by middleware.
- Every user-owned table uses Row Level Security; server mutations also constrain owner and Workspace IDs.
- Relationship triggers and policies prevent cross-owner and cross-project associations.
- Admin access uses `admin_members`, protected database functions, and audit logs. The initial owner email is bootstrapped in the admin migration and should be changed for another deployment.
- Account deletion re-verifies the current password plus the exact account name and email.
- URL capture rejects private/loopback hosts and non-standard ports and is limited to 20 attempts per hour.
- Rich job descriptions are sanitized before storage and rendering.
- The PWA caches versioned static assets only; authenticated HTML and API responses remain network-only.

## Deployment

1. Apply `supabase/migrations` to the target database.
2. Configure the production Site URL and recovery callback in Supabase Auth.
3. Set all production environment variables through the hosting platform.
4. Build with `pnpm build` and serve `apps/web` over HTTPS.
5. Sign in as an `admin_members` owner and verify Admin → System after deployment.

The included Dockerfile and `vercel.json` target the web application. The live project configured in this repository is <https://roleway.vercel.app>.

## License

Roleway is licensed under Apache-2.0. See [`LICENSE`](LICENSE).
