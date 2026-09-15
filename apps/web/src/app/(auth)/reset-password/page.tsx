import { CircleAlert } from "lucide-react";
import { RecoverySession } from "@/components/recovery-session";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPassword } from "@/app/auth/actions";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Choose a new password</h1>
        <p>
          {auth
            ? "Use at least eight characters and store it somewhere secure."
            : "Open this page from the recovery link in your email."}
        </p>
      </div>
      {query.error ? (
        <Alert variant="danger">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}
      <RecoverySession>
        {auth ? (
          <form className="auth-minimal-form" action={resetPassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
            </FieldGroup>
            <SubmitButton className="w-full" pendingLabel="Updating password…">
              Update password
            </SubmitButton>
          </form>
        ) : null}
      </RecoverySession>
      <p className="auth-minimal-switch">
        {auth ? (
          <Link href="/login">Cancel</Link>
        ) : (
          <Link href="/forgot-password">Request a new recovery link</Link>
        )}
      </p>
    </div>
  );
}
