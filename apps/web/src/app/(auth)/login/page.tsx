import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

export default async function LoginPage(
  props: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }
) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/home");

  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Log in to Roleway</h1>
        <p>Continue to your focused job search.</p>
      </div>
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert> : null}
      {query.message ? <Alert role="status"><AlertDescription>{query.message}</AlertDescription></Alert> : null}
      <form className="auth-minimal-form" action={signIn}>
        <input type="hidden" name="next" value={query.next ?? ""} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </Field>
          <Field>
            <div className="auth-minimal-label-row">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          </Field>
        </FieldGroup>
        <SubmitButton className="w-full" pendingLabel="Logging in…">Log in</SubmitButton>
      </form>
      <p className="auth-minimal-switch">New to Roleway? <Link href="/signup">Create an account</Link></p>
      <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
