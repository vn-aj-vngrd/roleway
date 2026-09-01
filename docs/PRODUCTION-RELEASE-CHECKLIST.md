# Production release and security checklist

Last audited: 1 September 2026

This is the release gate for the hosted Roleway application. A checked item must be supported by a deployed control or captured evidence; configuration-only items are intentionally left unchecked.

## Current release verdict

**Not ready for public signups until every P0 item below is completed.** The application now has database-enforced admission control, an admin console, server-side authorization, API quotas, Turnstile integration, and baseline browser security headers. DDoS protection, Supabase Auth CAPTCHA enforcement, production secrets, email delivery, backups, monitoring, and a clean E2E run still require production infrastructure configuration.

## Implemented controls

- [x] Transactional account cap defaults to **200** and serializes concurrent registrations.
- [x] Admin managers can pause registrations and change the cap under Admin → Settings.
- [x] Signup fails closed in production when the admission query or Turnstile site key is unavailable.
- [x] Signup passes a Turnstile token to Supabase Auth.
- [x] Admin access is authorized by `admin_members` and protected database functions, not UI visibility.
- [x] Owners can assign admin roles; owners/admins can suspend and reactivate non-owner accounts.
- [x] Admin role, registration, and account-status changes write durable audit records.
- [x] Admin overview, user usage, data inventory, data-quality signals, system health, and audit views use live database records.
- [x] Anonymous requests without an auth cookie are redirected before a Supabase Auth request, reducing database/auth load during scans and floods.
- [x] Authenticated search is limited to 60 requests/minute/account.
- [x] Data export is limited to 3 requests/hour/account.
- [x] URL capture remains limited to 20 attempts/hour/account and retains SSRF/redirect/size/time/DNS checks.
- [x] Security headers include CSP, HSTS in production, frame denial, MIME sniffing denial, a restrictive permissions policy, and strict referrer handling.
- [x] Admin and export responses are `no-store`; authenticated PWA pages are not cached for offline use.
- [x] Account deletion no longer conflicts with retained, redacted admin audit history.
- [x] All 27 public application tables have RLS enabled. Tables without direct policies are intentionally closed and reachable only through protected functions or server-only service-role code.
- [x] Remote Supabase schema lint reports no errors.

## P0 — complete before enabling public traffic

### Cloudflare and abuse protection

- [ ] Put the production hostname behind Cloudflare (orange-cloud/proxied DNS).
- [ ] Set SSL/TLS mode to **Full (strict)** and enable Always Use HTTPS.
- [x] Create a production Turnstile widget restricted to `roleway.vanajvanguardia.tech`; use separate test/staging keys.
- [x] Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the production Vercel environment.
- [x] In Supabase Dashboard → Authentication → Bot and Abuse Protection, enable Cloudflare Turnstile and enter the matching **secret key**. A direct tokenless Supabase signup was verified as rejected.
- [ ] Test valid, expired, reused, missing, and invalid Turnstile tokens in a normal production browser. Tokens should be single-use and expire after five minutes.
- [ ] Enable Cloudflare Managed Rules and the Cloudflare OWASP ruleset, initially in log mode, then block after checking false positives.
- [ ] Enable Bot Fight Mode/Super Bot Fight Mode as available.
- [ ] Add edge rate limits before traffic reaches Vercel/Supabase:
  - `/signup`: challenge after 5 requests/minute/IP; block sustained abuse.
  - `/login`, `/forgot-password`, `/reset-password`: challenge after 10 requests/minute/IP.
  - `/api/search`: 120 requests/minute/IP, in addition to the account quota.
  - `/api/export`: 10 requests/hour/IP, in addition to the account quota.
  - all dynamic paths: a conservative per-IP burst rule with verified bots excluded.
- [ ] Configure an emergency Cloudflare rule that can challenge all non-admin traffic without redeploying.
- [ ] Confirm the origin cannot be reached through an unproxied alternate hostname. Supabase endpoints remain public by design and must retain Auth rate limits, CAPTCHA, RLS, and function authorization.

### Supabase production configuration

- [ ] Verify the account cap in Admin → Settings is **200** and registrations are open only when launch begins.
- [ ] Set Supabase Auth email/password signup rate limits and password-reset limits to conservative production values.
- [ ] Enable leaked-password protection and require sufficiently strong passwords in Supabase Auth.
- [ ] Configure custom SMTP; verify SPF, DKIM, DMARC, confirmation, reset, and abuse/bounce behavior.
- [ ] Confirm the production Supabase Site URL is `https://roleway.vanajvanguardia.tech` and the exact redirect allowlist includes `https://roleway.vanajvanguardia.tech/auth/callback`. Remove localhost and preview wildcards from production.
- [ ] Enable daily backups and Point-in-Time Recovery if the plan supports it; perform one restore rehearsal.
- [ ] Set database, Auth, storage, and egress budget alerts. Define a hard operational response before quotas are exhausted.
- [ ] Review slow-query and connection metrics. Use Supavisor transaction pooling for non-Supabase direct database clients.
- [ ] Confirm the service-role key is present only in server environments and is absent from browser bundles, logs, and client-visible error output.
- [ ] Confirm the initial production owner in `admin_members`; add a second owner for recovery, then verify the final-owner protection.
- [ ] Remove stale demonstration/E2E accounts and records from the production project before launch.

### Secrets and deployment

- [ ] Rotate the Supabase service-role key if it has ever appeared outside the production secret store.
- [ ] Generate independent 32-byte `AI_CREDENTIAL_ENCRYPTION_KEY` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` values. Do not reuse keys across environments.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.
- [ ] Verify Vercel Production variables are scoped to Production and sensitive values are not exposed to Preview deployments unnecessarily.
- [ ] Protect the production branch, require review/status checks, and prohibit force pushes.
- [ ] Enable Vercel deployment protection for previews that contain production-like data.
- [ ] Verify no `.env*`, browser auth state, traces, or credentials are committed.

### Monitoring and incident response

- [ ] Connect server errors to an alerting destination. `system_events` is a product signal, not a substitute for infrastructure monitoring.
- [ ] Alert on error-rate spikes, Auth/signup spikes, rate-limit spikes, database CPU/connections, egress, and failed backups.
- [ ] Add synthetic checks for landing, login, signup availability, and one authenticated read-only workflow.
- [ ] Write an incident runbook covering: pause signups, challenge traffic, revoke sessions, rotate keys, restore database, notify users, and preserve evidence.
- [ ] Name an on-call owner and test the alert path before launch.

## P1 — production quality gate

### Security verification

- [ ] Run dependency audit from a network that can reach the npm audit endpoint. The audit attempted on 1 September 2026 timed out and is not evidence of a clean dependency graph.
- [ ] Run secret scanning (`gitleaks` or equivalent) across full Git history.
- [ ] Run SAST and dependency scanning in CI (CodeQL/Dependabot or equivalents).
- [ ] Run DAST against staging through the real Cloudflare configuration (OWASP ZAP baseline at minimum).
- [ ] Test normal-user denial for every admin function, not just `/admin` rendering.
- [ ] Test IDOR attempts for Jobs, Opportunities, Workspaces, contacts, documents, interviews, Agent runs, exports, and admin target IDs.
- [ ] Test stored/reflected XSS in rich text, profile fields, job imports, URLs, search, audit labels, and admin query strings.
- [ ] Test CSRF/origin rejection on every consequential Server Action through an off-origin form.
- [ ] Test password reset replay, expired links, user enumeration, session fixation, session revocation, and suspended-user access.
- [ ] Test signup races with more than 200 concurrent attempts and confirm the account count never exceeds the configured cap.
- [ ] Load-test read routes with production-like data while watching Supabase connections, CPU, query latency, and egress.

### Reliability and data lifecycle

- [ ] Document retention for user records, Agent history, system events, and admin audit logs.
- [ ] Verify account export completeness against every account-owned relation.
- [ ] Verify account deletion removes or anonymizes every account-owned relation, Auth identity, encrypted provider credential, and storage object.
- [ ] Add pagination before the platform exceeds 200 accounts; the current admin user view intentionally caps output at 200.
- [ ] Define maintenance mode and a user-visible recovery message for Supabase or provider outages.
- [ ] Verify migrations on a fresh database and on a production-size restored snapshot.

### Privacy and legal

- [ ] Review the privacy policy against actual providers, data retention, exports, deletion, AI disclosure, and subprocessors.
- [ ] Publish terms of use and a security contact.
- [ ] Record a lawful-basis/consent decision for analytics before adding any third-party analytics script.
- [ ] Do not add session replay to authenticated pages without explicit privacy review and aggressive redaction.

## Threat audit summary

| Threat | Current control | Residual risk / required action |
| --- | --- | --- |
| SQL injection | Supabase query builder/RPC parameters; no request-derived raw SQL; export table names are a source-code allowlist | Keep dynamic SQL out of request paths; review the one migration-time dynamic definition rewrite separately |
| Broken access control / IDOR | RLS on all public tables, relationship triggers, scoped actions, admin security-definer checks | Expand negative E2E coverage for every protected function and relation |
| Credential stuffing / auth abuse | Generic auth errors; Turnstile token plumbing; signup cap | Enable Supabase CAPTCHA/rate limits and Cloudflare edge rules before launch |
| DDoS / resource exhaustion | Anonymous middleware fast-path; per-account search/export/capture quotas | Cloudflare proxy/WAF/rate limiting and load testing remain mandatory; application code alone cannot absorb volumetric DDoS |
| Signup-cap race | Advisory transaction lock plus database trigger | Load-test concurrent signup; monitor failed Auth attempts |
| XSS | React escaping, rich-text sanitization, CSP | CSP currently needs `unsafe-inline` for existing Next.js inline/style behavior; migrate to nonce/hash CSP as a later hardening step |
| CSRF | SameSite auth cookies and Next.js Origin/Host checks on Server Actions | Verify production proxy host/origin behavior and add DAST tests |
| SSRF | URL scheme/port/DNS/private-IP checks, fixed ATS endpoints, redirect/size/time limits | Retest DNS rebinding and redirect chains periodically |
| Secret exposure | `server-only` service client, encrypted AI keys, redacted system events | Rotate and scan; keep production secrets out of previews and support logs |
| Data exfiltration | RLS, no-store responses, private export, service-role isolation | Test export completeness and direct REST/RPC denial with anon/user tokens |
| Account takeover | Supabase sessions, password reset, suspension support | Enable leaked-password protection, MFA for admins, SMTP protections, and session-revocation runbook |
| Supply chain | Frozen lockfile and pinned Next.js runtime | Dependency audit timed out; enable automated scanning and review install scripts |
| Clickjacking / MIME confusion | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff` | Verify headers at the final Cloudflare-served origin |
| Logging/privacy leakage | Redacted error codes; bounded metadata; no raw prompts/stacks in system events | Review infrastructure logs and third-party monitoring scrubbing |
| Database overload | Request short-circuiting and quotas; bounded admin result sets | Add Cloudflare controls, alerts, query monitoring, and production load tests |

## Final release commands

Run from a clean worktree against the release candidate:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @roleway/web test:e2e
pnpm build
supabase db lint --linked --level warning
```

Then verify through the production domain at 1440px and 390px:

- [ ] No console/network errors, horizontal overflow, dead actions, or ambiguous recovery states.
- [ ] Signup succeeds with Turnstile while places remain.
- [ ] Signup fails when paused and when the cap is reached.
- [ ] Direct Supabase signup without CAPTCHA fails.
- [ ] Normal users are denied every admin surface and mutation.
- [ ] Admin overview, user search, suspend/reactivate, roles, data, system, audit, and registration settings work.
- [ ] Export, deletion, password reset, URL capture, Agent-disabled operation, and critical Opportunity workflow work.
- [ ] Cloudflare, Vercel, Supabase, SMTP, backup, and alert dashboards show expected traffic without unexplained errors.
