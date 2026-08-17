import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, signUp } from "@/app/auth/actions";
import { LogoMark } from "@/components/logo";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/today");

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link href="/" className="brand auth-brand"><LogoMark size={24} /><span>Roleway</span></Link>
        <div>
          <h1>Move every opportunity forward.</h1>
          <p>Organize your search, prepare stronger applications, and know what to do next—without giving up control.</p>
        </div>
        <p className="auth-foot">Open source · Your data stays yours</p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div>
            <h2>Sign in or create an account</h2>
            <p className="page-subtitle">Use your email and a password of at least 8 characters. New accounts sign in immediately.</p>
          </div>
          {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
          {query.message ? <div className="form-alert success" role="status">{query.message}</div> : null}
          <form className="auth-form">
            <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
            <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /></div>
            <button className="button primary auth-submit" formAction={signIn}>Sign in</button>
            <button className="button secondary auth-submit" formAction={signUp}>Create account</button>
          </form>
          <p className="muted small">By continuing, you agree to store your job-search data in your configured Roleway workspace.</p>
        </div>
      </section>
    </main>
  );
}
