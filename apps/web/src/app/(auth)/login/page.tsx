import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/today");

  return (
      <div className="auth-minimal-form-wrap">
        <div className="auth-minimal-copy">
          <h1>Log in to Roleway</h1>
          <p>Continue to your job-search workspace.</p>
        </div>
        {query.error ? <div className="auth-minimal-alert error" role="alert">{query.error}</div> : null}
        {query.message ? <div className="auth-minimal-alert success" role="status">{query.message}</div> : null}
        <form className="auth-minimal-form" action={signIn}>
          <input type="hidden" name="next" value={query.next ?? ""} />
          <div className="auth-minimal-field">
            <label htmlFor="email">Email</label>
            <input className="auth-minimal-input" id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
          </div>
          <div className="auth-minimal-field">
            <label htmlFor="password">Password</label>
            <input className="auth-minimal-input" id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          </div>
          <SubmitButton className="auth-minimal-submit" pendingLabel="Logging in…">Log in</SubmitButton>
        </form>
        <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
        <p className="auth-minimal-switch">New to Roleway? <Link href="/signup">Create an account</Link></p>
      </div>
  );
}
