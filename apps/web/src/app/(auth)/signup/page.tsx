import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/today");

  return (
      <div className="auth-minimal-form-wrap">
        <div className="auth-minimal-copy">
          <h1>Create your account</h1>
          <p>Start a focused workspace for your job search.</p>
        </div>
        {query.error ? <div className="auth-minimal-alert error" role="alert">{query.error}</div> : null}
        <form className="auth-minimal-form" action={signUp}>
          <div className="auth-minimal-field">
            <label htmlFor="email">Email</label>
            <input className="auth-minimal-input" id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </div>
          <div className="auth-minimal-field">
            <label htmlFor="password">Password</label>
            <input className="auth-minimal-input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" />
            <span className="sr-only" id="password-hint">Use at least 8 characters.</span>
          </div>
          <SubmitButton className="auth-minimal-submit" pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
        <p className="auth-minimal-switch">Already have an account? <Link href="/login">Log in</Link></p>
      </div>
  );
}
