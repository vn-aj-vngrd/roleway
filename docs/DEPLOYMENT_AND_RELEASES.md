# Deployment and releases

## Ownership

Vercel's existing GitHub integration deploys Roleway. `main` is production; PR branches receive previews when enabled by Vercel. GitHub Actions creates source versions and release notes. Release success and deployment success are separate evidence.

The release workflow follows Relay: successful push CI on main triggers a release of that exact SHA, provided it remains the current main head. PR-triggered workflows cannot invoke privileged release code. Superseded heads are consolidated into the next release.

`.releaserc.json` defines version rules: breaking changes produce major releases, features minor releases, and other conventional types patch releases. The first release starts at v1.0.0 when no prior release tag exists. Tags are the version source of truth; package versions remain development metadata. GitHub Releases contains the generated notes. Use the PR title unchanged as the squash subject; the original branch commits do not become separate release-note entries.

## Activate and verify

1. Merge the reviewed PR with passing CI after explicit user authorization.
2. Verify CI and Release completed for the expected main SHA. The job-scoped GitHub token creates tags/releases; no personal token is needed.
3. Verify Vercel reports Ready for that same SHA and that the canonical alias serves the application.
4. Run affected browser journeys against the deployment. Apply forward Supabase migrations before code that requires them, using the configured project's migration tooling and preserving data.

Vercel deploys independently of GitHub CI. These workflows do not claim to gate production deployment on CI. Branch protection should require the `Lint, types, tests, and build` check and an up-to-date PR, prohibit force pushes/deletion, and use PR titles for squash subjects. For solo maintenance, a separate human reviewer count is optional; merge authorization remains mandatory.

## Browser CI

`Browser journeys` is manually dispatched against the selected branch. Configure the GitHub `e2e` environment with E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_SUPABASE_SERVICE_ROLE_KEY, and E2E_AI_CREDENTIAL_ENCRYPTION_KEY. Use an isolated Supabase project with the repository migrations applied. Tests create disposable users and clean them up. Do not expose these secrets to untrusted PR code or publish browser traces containing sessions.

The ordinary CI build uses placeholders and runs without production credentials. It cannot prove remote database or real-provider integration. Live AI verification additionally requires an authorized BYO-provider connection and must cover generation, approval, persisted mutation, rejection, and failure recovery.

## Recovery

- CI failure prevents release creation. Vercel may still have deployed independently; inspect both.
- Failed Vercel deployment: inspect build/runtime logs, fix through a PR, or roll back through Vercel when authorized. Preserve release history.
- Failed release: inspect the Actions log and rerun after correction. If a tag exists without release notes, verify its SHA before restoring notes. Preserve published tags.
- Database unavailable: restore project connectivity before interpreting authenticated E2E failures as application defects.

Pinned release tooling follows Relay, including its compatible Conventional Commits preset. Upgrade analyzer, notes generator, and preset together and run `pnpm test:workflow`.
