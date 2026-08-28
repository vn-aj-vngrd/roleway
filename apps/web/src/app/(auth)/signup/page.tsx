import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Create an account" };

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/home");

  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Create your Roleway account</h1>
        <p>Start one focused workspace for your job search.</p>
      </div>
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert> : null}
      <form className="auth-minimal-form" action={signUp}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" />
            <FieldDescription id="password-hint">Use at least 8 characters.</FieldDescription>
          </Field>
        </FieldGroup>
        <SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
      </form>
      <p className="auth-minimal-switch">Already have an account? <Link href="/login">Log in</Link></p>
      <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
