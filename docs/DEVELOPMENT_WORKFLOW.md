# Development workflow

This is the authority for branches, commits, pull requests, reviews, and merge handoffs. Roleway follows Relay's PR loop, with `main` as its production integration branch.

## Start and implement

1. Inspect the working tree and current PR. Preserve inherited changes.
2. Fetch `origin/main`. Start independent work on `van/<short-kebab-case-description>` from that ref. When a real ticket exists, use `van/<TICKET>/<description>`; keep its reference in commit and PR bodies.
3. Continue review fixes on the existing PR branch. Use the domain and design pointers in `AGENTS.md` for implementation constraints.
4. Reproduce defects and add regression coverage at the affected seam. Verify the actual browser journey for behavior changes, including 1440px desktop, 390px mobile, errors, and recovery. Distinguish provider fixtures from live AI evidence.

## Commit and open a PR

1. Run `pnpm setup:hooks` once per checkout. The commit hook runs `pnpm check:full`; browser checks remain separate because they require a configured Supabase environment.
2. Use `<type>(optional-scope): Summary` for commits, PR titles, and squash subjects, including ticket branches. Supported types are enforced by `scripts/validate-commit-message.mjs`. Use an imperative, sentence-case summary, ideally at most 72 characters, with no trailing period. Example: `fix(agent): Preserve approval cards across Workspaces`.
3. Mark incompatible changes with `!` and a `BREAKING CHANGE:` footer describing migration/impact. Put real ticket references in the body.
4. Push the named feature branch and open a PR against `main` using the template. This project's iteration workflow authorizes preparing commits and opening PRs for requested implementation work. Keep credentials, reusable browser state, traces, and generated build output out of the commit.
5. Inspect checks and every review finding on the current head. Fix valid findings, explain resolutions with evidence, and resolve addressed threads. Push fixes to the same PR, then recheck checks and new findings.

## Merge and verify

Merge requires explicit user authorization, passing current-head checks, an up-to-date base, and resolved review blockers. Changes reach `main` through PRs, including hotfixes. Keep published history intact; merge `origin/main` to update a published branch. Squash with the validated PR title as the subject.

After merging, verify main CI, the GitHub release, and the Vercel production deployment independently. Follow [Deployment and releases](DEPLOYMENT_AND_RELEASES.md) for activation and failure recovery. Start the next independent task from freshly fetched main.

**Complete when:** the handoff links the PR, describes final behavior and test evidence, and identifies any failing or unrun checks. A configured workflow is not proof that it has executed. Leave the PR open until merge authorization is given.
