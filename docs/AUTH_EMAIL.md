# Auth email setup

Roleway sends Supabase Auth email as `Roleway <roleway@vanajvanguardia.tech>` through Resend. The verified root domain covers this sender; a separate sending-only key isolates Roleway from Relay. Supabase owns delivery. The Next.js runtime does not need the Resend key.

## Apply hosted settings

1. Apply the confirmed-account admission migration, then deploy the auth callback and `/verify-email` route before enabling confirmations or applying templates. Confirm the canonical production deployment is Ready.
2. Create a Resend key with Sending access restricted to `vanajvanguardia.tech`. Save `RESEND_API_KEY` and `SMTP_FROM_EMAIL` in ignored `.env.local`. Supply `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` only in the setup shell; the script checks the Roleway project and approved sender.
3. Run `node --env-file=.env.local scripts/configure-auth-email.mjs` to inspect changed field names. Review the target and current CAPTCHA status.
4. Run the same command with `--apply`. Completion requires the script's read-back verification to pass. It patches email settings, leaving CAPTCHA, hooks, and OAuth configuration intact. Avoid a bulk `supabase config push` against production.
5. Request an auth email to an authorized real inbox. Confirm Resend reports Delivered, inspect the Roleway sender and template, and exercise the link in a fresh browser. A successful API response alone does not prove delivery.

The script is the hosted settings source; `supabase/config.toml` configures local Supabase with localhost callbacks and mail capture. Template HTML lives in `supabase/templates`. Applying hosted settings also installs the templates, requires signup confirmation, enables secure email/password changes and security notices, and corrects the canonical URL. Secrets are never printed by the script.

## Verify behavior

The account cap counts verified, non-deleted accounts. Confirmation claims capacity under the same admission lock as signup. Pending accounts receive no new Profile or Workspace until confirmation. Existing unverified records remain preserved and excluded from the cap, so abandoned signups cannot exhaust it.

- Signup without a session shows `/verify-email`. Unconfirmed password login goes there too. Resend requires a fresh Turnstile challenge and returns a neutral success message.
- Confirmation links establish a session and open onboarding. Recovery and invite links open password setup. Expired or reused links offer recovery instead of a dead page.
- Email change, magic link, and reauthentication templates support the corresponding Supabase Auth operations; their templates do not imply that Roleway exposes every operation as a product feature.
- Test confirmation and recovery journeys with the E2E suite before production SMTP activation. For later integration tests, use an isolated Supabase project: password-change notifications to synthetic `roleway.test` accounts would otherwise bounce through production Resend.
- Keep Turnstile enabled in production. Public signup and recovery require an actual valid challenge; Admin API fixtures only prove token handling and authenticated workflows.
- Default signup tests pass through `/verify-email` when confirmation is enabled, then use an Admin-generated confirmation for that disposable account. This verifies the callback independently of inbox delivery.

## Troubleshoot

If mail fails, check Resend delivery/logs, domain verification, the key's domain restriction, Supabase SMTP settings, and email rate limits. Keep link tracking disabled for auth links. If a link opens the wrong host, compare the deployed `NEXT_PUBLIC_SITE_URL` with the hosted Auth site URL. Existing links retain their original target; request a new one after correcting settings.

For key rotation, create a replacement with the same scope, update the ignored setup secret, apply and verify delivery, then revoke the old key. Preserve Relay's separate key. Never commit secrets, email tokens, or authenticated browser traces.

References: [Resend Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
