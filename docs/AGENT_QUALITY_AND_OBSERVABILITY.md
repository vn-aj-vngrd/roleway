# Agent quality and observability

Settings → Agent → Usage & quality shows each account its own 30-day run metrics, provider/model breakdown, reported cost coverage, error categories, reply ratings, and synthetic model checks. Admin → Agent shows the same measures across accounts without prompts, answers, account identifiers, or credentials. A rating is user feedback, not a verified factual error.

## Evidence boundaries

- Every run records elapsed time, time to first streamed text when available, token totals, and a redacted failure code. Historical elapsed time is reconstructed from saved finish events where possible; older first-text and cost data remain unknown.
- OpenRouter cost is read from its generation metadata for every model step. If any step lacks a reliable charge, cost remains unavailable for the run. Other BYO providers and compatible endpoints currently have no verified cost source; Roleway never treats missing cost as zero or derives a price from a model name.
- A person may start up to three synthetic model checks in a rolling 24-hour window against one of their connected provider/model combinations. The six checks cover document tool choice, exact arguments, answer grounding, injected instructions, unavailable cross-account data, and claims of applied work. They use fixed synthetic context, make billable provider requests, and store only check names, pass/fail results, tokens, and provider-reported cost. A passing suite is one sample for that connection, not a quality guarantee.
- Admin aggregates include run failure codes, bad-rating reasons, model breakdown, daily activity, and eval check pass counts. They do not reveal raw conversation content or user identity.
- OpenTelemetry is opt-in with `AGENT_OTEL_ENABLED=true`. AI SDK telemetry emits model/tool spans with input and output recording disabled. Roleway adds fixed-name context and completion database spans. Configure a protected OTLP collector in the deployment environment and verify its access controls separately; enabling the flag alone does not establish export.

## Security and rollout

Apply `20260928210000_agent_quality_metrics.sql`, `20260928230000_agent_health_coverage.sql`, and `20260928234000_agent_eval_reservations.sql` before deploying the application. Reservations enforce the per-account check limit atomically and incomplete checks are excluded from summaries. `agent_health(false)` restricts results to `auth.uid()`; `agent_health(true)` additionally requires `is_roleway_admin()`. User ratings update only their own Agent messages. Eval runs are account-owned, reference only a connection owned by the same account, and cascade on account deletion. Export includes eval summaries. No user API key is copied into metrics or traces.

Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, the Agent browser suite, and `pnpm build`. Use a disposable account to verify private/global separation, normal-user denial of Admin, good/bad rating persistence, failed model checks, and desktop/mobile layout. The checked-in live eval suite remains an additional developer gate and requires an explicit provider test key. A fixture, successful build, or local migration file does not prove hosted migration, trace export, or a real provider's cost response.
