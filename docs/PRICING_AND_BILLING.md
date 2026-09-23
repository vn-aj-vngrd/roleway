# Plans, billing, and storage

## Research and decisions — 15 September 2026

Roleway's current documents are database content, not uploaded files. Supabase distinguishes [database disk](https://supabase.com/docs/guides/platform/manage-your-usage/disk-size), [object storage](https://supabase.com/docs/guides/storage/pricing), and [egress](https://supabase.com/docs/guides/storage/serving/bandwidth). An app quota is a product allowance, not an estimate of physical database/index/WAL costs. Do not promise file capacity before an upload workflow exists.

[Teal keeps core tracking free](https://help.tealhq.com/en/articles/9535168-is-there-a-teal-free-trial). [Notion separates file limits by plan](https://www.notion.com/pricing). Roleway will keep tracking features on every tier and differentiate the number of concurrent searches and saved content capacity. Initial editable allowances are hypotheses, not market-validated willingness to pay:

| Plan | Active Workspaces | Saved content |
| --- | ---: | ---: |
| Free | 1 | 10 MiB |
| Plus | 5 | 100 MiB |
| Pro | 20 | 500 MiB |

Currency starts as PHP. Paid prices are unset and Plus/Pro start coming soon. Admin must set prices and payment instructions before enabling manual requests. No automatic charge or recurring debit exists. A paid purchase grants one calendar month; renewal of the same plan extends its existing unexpired term. Different-plan purchases start a new term after approval, with no implicit proration.

[Stripe's bank-transfer guidance](https://docs.stripe.com/payments/bank-transfers/accept-a-payment) uses references and reconciliation to match payments. Roleway adopts only the operational principle: create a request with a frozen amount and instructions, provide an account/reference identifier, collect the transfer reference, then have an authorized admin verify actual receipt. At most three requests can be created per account in 24 hours. A submitted reference is not payment proof and never grants access automatically.

## Enforcement

Limits belong to the account and are read from the live catalog. Expired paid assignments use Free. Archived Workspaces release an active slot, but their content still counts. Existing over-limit accounts retain read/export/delete access. New content growth and new/restored Workspaces are blocked until usage falls or the plan changes. Quotas are enforced transactionally in PostgreSQL, including direct API and Agent writes.

Saved content is the UTF-8 size of JSON representations of owned product rows, including documents and append-only versions, job records, notes, contacts, and Agent history. Career Profile, Workspace details, notifications, and activity history also count, so direct writes cannot hide large content in metadata. It excludes credentials, system telemetry, billing administration, and database/index/WAL overhead. Deleting records releases their measured size; editing a document also creates a version, so deleting unused documents and conversations is the clearest way to free space. No files are uploaded by the current document workflow. Future object uploads must add reservation/finalization and deletion accounting before being exposed.

## Delivery scope

- Public catalog and landing pricing, account plan/usage and manual billing history.
- Admin catalog, manual payment instructions and QR image, request review, user plan assignment and expiry.
- Focused admin sidebar with Back to app; user detail with scoped content inspection and audit trail.
- Searchable help articles, admin article editing, and configurable support contact.
- Database authorization/limit/payment regression tests and desktop/mobile browser checks.

## Activation

Apply the forward migrations before deploying code. Review defaults and existing account usage. In Admin → Plans set paid prices and allowances; in Billing configure beneficiary, bank/reference instructions, optional QR, and support contact. Enable manual payments and change a paid plan to available only when ready to accept transfers. Verify a disposable request, rejection, approval, duplicate approval, expiry, and over-limit recovery. Never delete customer data during a plan change.

## Verification commands

Apply each migration in one transaction (`psql --single-transaction`); the capacity backfill locks its metered tables while recalculating. `supabase/tests/plans_billing.sql` covers limits, preservation, expiry, manual payment replay, and authenticated RLS. The Agent transaction fixture explicitly uses Pro for its cross-Workspace scenarios.

For stable browser validation alongside the development server, build first, then run `E2E_AUTH_MODE=admin E2E_BASE_URL=http://localhost:3004 E2E_WEB_SERVER_COMMAND='pnpm exec next start --port 3004' pnpm --filter @roleway/web test:e2e plans-admin`. Omit `plans-admin` for the full suite. This uses disposable accounts and synthetic payment records without enabling paid plans or collecting money. Admin fixture mode does not verify CAPTCHA or password login; email delivery and live AI provider checks are separate.

## Private assignments

Unlimited is hidden from public catalog queries, landing pricing, and self-service purchases. Only authorized admins can assign it on a user detail page. It bypasses Workspace and saved-content caps, keeps usage metering, and has no expiry; it does not grant admin permissions or bypass security/API rate limits. New accounts explicitly start Free. Plus and Pro start Coming soon and remain configurable in admin. Manual paid approvals grant one calendar month. Admin assignment defaults to one month when expiry is blank, with an optional explicit expiry for support corrections. Free and Unlimited ignore expiry.
