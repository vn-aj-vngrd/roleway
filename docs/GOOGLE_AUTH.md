# Google sign-in beta

Roleway follows Relay's Supabase OAuth approach: a separate “Continue with Google” action with a Beta badge, server-side PKCE exchange, and a ten-minute HttpOnly destination cookie. The button is hidden and its server action rejects requests until `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## 1. Create the Google client

Use a Roleway-specific Web application OAuth client in [Google Auth Platform](https://console.cloud.google.com/auth/overview). Relay's existing client and credentials can stay unchanged.

- Configure branding as Roleway, with a support email, homepage `https://roleway.vanajvanguardia.tech`, and privacy policy `https://roleway.vanajvanguardia.tech/privacy`.
- Choose External audience when users outside your organization need access. While Google publishing status is Testing, add each beta user's Google email under Test users. The UI Beta badge does not grant Google test access.
- Request only `openid`, `userinfo.email`, and `userinfo.profile`. This feature does not access Gmail, Drive, or Calendar.
- Add authorized JavaScript origin `https://roleway.vanajvanguardia.tech`. For a development client, also add `http://localhost:3003`.
- Add the authorized redirect URI shown on Supabase's Google provider page. For the currently configured Roleway project it is `https://bqcsztvfbokmccgmnyhl.supabase.co/auth/v1/callback`. Verify this against your project before saving; a different Supabase project has a different URI.

Complete when you have the Web client ID and secret. Store the secret directly in Supabase or a password manager; it is not a `NEXT_PUBLIC_` variable and does not belong in Git or chat.

## 2. Enable the Supabase provider

In the Roleway Supabase project, open Authentication → Sign In / Providers → Google. Enable Google and enter the Web client ID and secret. Keep nonce checks enabled. Use Supabase's standard account identity handling; the application does not merge accounts manually.

Under Authentication → URL Configuration, keep Site URL aligned with `NEXT_PUBLIC_SITE_URL` and add these exact app return URLs:

```text
https://roleway.vanajvanguardia.tech/auth/callback?provider=google
http://localhost:3003/auth/callback?provider=google
```

The Google authorized redirect URI ends in `/auth/v1/callback` on Supabase. The Supabase return allowlist points to `/auth/callback?provider=google` on Roleway. They are two different steps of the redirect chain. For another domain or port, allowlist its exact return URL and use that origin for `NEXT_PUBLIC_SITE_URL`. Keep the browser origin and configured origin the same so PKCE and destination cookies remain available.

Complete when the provider is enabled and the return URLs match the environments you will test. Existing database signup admission triggers must be applied: they also govern Google-created accounts. Paused/full registration must reject new accounts while existing Google accounts can still sign in through Login. Keep password CAPTCHA protection enabled.

## 3. Enable the app

In `apps/web/.env.local` for local development, or the appropriate Vercel environment for deployment:

```dotenv
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

Use `https://roleway.vanajvanguardia.tech` as the production site URL. The Supabase URL and anon key remain the existing values. No Google client secret is needed in Vercel or browser code. Restart the dev server or redeploy after changing the public flag. Configure a preview's own canonical origin and exact callback allowlist before enabling it there.

Complete when Login and an open Signup page display the rounded Google action with its Beta badge. Set the flag back to `false` and redeploy to remove the entry point; provider disabling is a separate Supabase operation.

## 4. Verify before widening access

1. Use an approved Google test account. Confirm a new user reaches onboarding and receives one Profile and Workspace through the existing provisioning triggers.
2. Finish onboarding, sign out, and return with Google. Confirm the same account and Workspace reappear. Test Login with `?next=/settings/profile` and confirm that destination is restored.
3. Cancel Google consent. Confirm Login offers a retry and email fallback, without raw provider details.
4. Test a non-approved account while Google's audience is in Testing; Google may display its own blocked-access screen before Roleway receives a callback.
5. In an isolated test project, test existing email-account identity linking, closed/full registration, and recovery. Never delete or manually merge an existing account to make OAuth work.
6. Check both themes, keyboard focus, and 390px mobile layout. Run `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true pnpm --filter @roleway/web test:e2e google-auth` against a local server started with the same flag. This test verifies UI and callback error recovery; it does not complete Google's external login.

Complete when a real Google round trip, onboarding, returning login, and cancellation work. Mocked code exchange, local browser checks, and CI do not establish hosted provider readiness. Google publishing/brand verification is separate from Roleway's Beta badge.

## Implementation ownership

- `apps/web/src/components/google-sign-in.tsx`: shared auth entry and pending state.
- `apps/web/src/app/auth/google.ts`: flag guard, provider initiation, safe destination cookie.
- `apps/web/src/app/auth/callback/route.ts`: Google session verification and onboarding routing, alongside unchanged email token/recovery paths.
- `apps/web/src/lib/google-oauth-error.ts`: fixed recovery copy. Provider errors and secrets are not echoed or logged.

Reference: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
