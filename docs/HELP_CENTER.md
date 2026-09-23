# Help Center maintenance

Read this when changing public Help, adding a product workflow, or editing seeded support content.

## Authority

- `help_articles` owns article titles, summaries, bodies, publication and update dates. Administrators can edit this content. Add default guides through forward migrations; preserve existing editorial changes on slug conflicts.
- `apps/web/src/features/help/catalog.ts` owns topic membership and app destinations. Unknown article slugs remain visible under More guides and in search.
- Help renders a safe plain-text subset: `## Heading`, consecutive numbered lines, consecutive `- ` bullets, and paragraphs separated by blank lines. HTML remains escaped text. Keep instructions usable without executable markup.
- Relay's Help Center is the interaction reference: task-oriented topics, prerequisites, steps, expected outcomes, troubleshooting, related guides and app links. Roleway's terms and actual behavior remain authoritative.

## Coverage

The baseline has 25 guides across eight topics: getting started/account recovery; Workspaces/Home/search; capture/Opportunities/applications/outcomes; interviews/contacts/documents/notes; Agent creation/exploration/privacy; Insights/notifications/profile/privacy/mobile; plans/payments/support; and role-protected administration.

For a changed workflow, inspect its route and actions, update the matching article, and check its app destination. Explain required access, the steps, what success looks like, and recovery. Separate recorded internal work from external actions the user performs. Keep dynamic prices and quotas in Plan & billing rather than copying values into new guides.

## Verification and release

1. Run catalog/parser tests and the Help browser suite. Exercise topic filtering, multiword and empty-result search, article contents navigation, related guides, app links, long text and 390px/1440px layouts. Include dark mode and keyboard access.
2. Validate forward content migrations against a disposable database. Repeat insertion and confirm existing editorial content survives. Existing RLS continues to limit anonymous reads to published articles.
3. Apply the content migrations with the Help UI release. A local fixture article proves rendering, not hosted publication. Browser fixtures remove only the records they inserted.

Complete when every supported app area has a discoverable guide, every action points to an implemented route, and the handoff separates local verification from migration/deployment state.

## Current verification

The two content migrations produced 25 guides in a temporary PostgreSQL database. Reapplication preserved a deliberately edited article. Typecheck, 111 unit tests, lint and the production build passed. Both Help browser tests passed for topic navigation, multiword search, empty results, structured steps, related guides, native app links, desktop/mobile layouts and dark mode, with no browser errors. Production publication requires the content migrations and UI deployment.
