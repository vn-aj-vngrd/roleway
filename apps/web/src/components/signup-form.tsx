"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { signUp } from "@/app/auth/actions";
import { AuthCaptchaWidget } from "@/components/auth-captcha-widget";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({ siteKey }: { siteKey: string | undefined }) {
  const [captchaToken, setCaptchaToken] = useState(
    siteKey ? "" : "development-bypass",
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const mismatch =
    confirmationTouched && confirmation.length > 0 && password !== confirmation;
  const passwordType = showPasswords ? "text" : "password";

  function validateConfirmation(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirmPassword")) {
      event.preventDefault();
      setPassword(String(formData.get("password") ?? ""));
      setConfirmation(String(formData.get("confirmPassword") ?? ""));
      setConfirmationTouched(true);
      confirmationRef.current?.focus();
    }
  }

  return (
    <form
      className="auth-minimal-form"
      action={signUp}
      onSubmit={validateConfirmation}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={320}
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field>
          <div className="auth-minimal-label-row">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              aria-pressed={showPasswords}
              onClick={() => setShowPasswords((shown) => !shown)}
            >
              {showPasswords ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
              {showPasswords ? "Hide" : "Show"}
            </Button>
          </div>
          <Input
            id="password"
            name="password"
            type={passwordType}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-describedby="password-hint password-length"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldDescription id="password-hint">
            Use a unique password with 16 or more characters. Try unrelated
            words or let a password manager create one.
          </FieldDescription>
          <ul
            id="password-length"
            className="auth-password-guidance"
            aria-label="Password length guidance"
          >
            {[
              { length: 8, label: "8 characters minimum" },
              { length: 16, label: "16+ characters recommended" },
            ].map(({ length, label }) => {
              const met = password.length >= length;
              const Icon = met ? Check : Circle;
              return (
                <li key={length} data-met={met}>
                  <Icon aria-hidden="true" />
                  <span>
                    {label}
                    <span className="sr-only">
                      {met ? ": met" : ": not yet met"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Field>
        <Field data-invalid={mismatch || undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            ref={confirmationRef}
            id="confirmPassword"
            name="confirmPassword"
            type={passwordType}
            autoComplete="new-password"
            maxLength={128}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onBlur={() => setConfirmationTouched(true)}
            aria-invalid={mismatch || undefined}
            aria-describedby={
              mismatch
                ? "password-confirmation-error"
                : "password-confirmation-hint"
            }
          />
          {mismatch ? (
            <FieldError id="password-confirmation-error">
              Passwords don’t match. Enter the same password in both fields.
            </FieldError>
          ) : (
            <FieldDescription id="password-confirmation-hint">
              {confirmation && password === confirmation
                ? "Passwords match."
                : "Enter your password again to confirm it."}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>
      <input type="hidden" name="captchaToken" value={captchaToken} />
      {siteKey ? (
        <AuthCaptchaWidget siteKey={siteKey} onTokenChange={setCaptchaToken} />
      ) : null}
      <SubmitButton
        className="w-full"
        pendingLabel="Creating account…"
        disabled={!captchaToken}
      >
        Create account
      </SubmitButton>
    </form>
  );
}
