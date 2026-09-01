"use client";

import { useState } from "react";
import { signUp } from "@/app/auth/actions";
import { AuthCaptchaWidget } from "@/components/auth-captcha-widget";
import { SubmitButton } from "@/components/submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({ siteKey }: { siteKey: string | undefined }) {
  const [captchaToken, setCaptchaToken] = useState(siteKey ? "" : "development-bypass");
  return <form className="auth-minimal-form" action={signUp}>
    <FieldGroup>
      <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={320} required placeholder="you@example.com" /></Field>
      <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="password-hint" /><FieldDescription id="password-hint">Use at least 8 characters.</FieldDescription></Field>
    </FieldGroup>
    <input type="hidden" name="captchaToken" value={captchaToken} />
    {siteKey ? <AuthCaptchaWidget siteKey={siteKey} onTokenChange={setCaptchaToken} /> : null}
    <SubmitButton className="w-full" pendingLabel="Creating account…" disabled={!captchaToken}>Create account</SubmitButton>
  </form>;
}
