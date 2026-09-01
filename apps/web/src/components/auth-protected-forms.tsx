"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset, signIn } from "@/app/auth/actions";
import { AuthCaptchaWidget } from "@/components/auth-captcha-widget";
import { SubmitButton } from "@/components/submit-button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ siteKey, nextPath }: { siteKey: string | undefined; nextPath: string }) {
  const [captchaToken, setCaptchaToken] = useState(siteKey ? "" : "development-bypass");
  return <form className="auth-minimal-form" action={signIn}>
    <input type="hidden" name="next" value={nextPath} />
    <FieldGroup>
      <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={320} required placeholder="you@example.com" /></Field>
      <Field><div className="auth-minimal-label-row"><FieldLabel htmlFor="password">Password</FieldLabel><Link href="/forgot-password">Forgot password?</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></Field>
    </FieldGroup>
    <input type="hidden" name="captchaToken" value={captchaToken} />
    {siteKey ? <AuthCaptchaWidget siteKey={siteKey} onTokenChange={setCaptchaToken} /> : null}
    <SubmitButton className="w-full" pendingLabel="Logging in…" disabled={!captchaToken}>Log in</SubmitButton>
  </form>;
}

export function PasswordResetRequestForm({ siteKey }: { siteKey: string | undefined }) {
  const [captchaToken, setCaptchaToken] = useState(siteKey ? "" : "development-bypass");
  return <form className="auth-minimal-form" action={requestPasswordReset}>
    <div className="auth-minimal-field"><label htmlFor="email">Email</label><input className="auth-minimal-input" id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={320} required placeholder="you@example.com" /></div>
    <input type="hidden" name="captchaToken" value={captchaToken} />
    {siteKey ? <AuthCaptchaWidget siteKey={siteKey} onTokenChange={setCaptchaToken} /> : null}
    <SubmitButton className="auth-minimal-submit" pendingLabel="Sending recovery link…" disabled={!captchaToken}>Send recovery link</SubmitButton>
  </form>;
}
