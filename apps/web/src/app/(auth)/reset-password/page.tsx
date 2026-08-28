import Link from "next/link";
import { resetPassword } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  return <div className="auth-minimal-form-wrap">
    <div className="auth-minimal-copy"><h1>Choose a new password</h1><p>{auth ? "Use at least eight characters and store it somewhere secure." : "Open this page from the recovery link in your email."}</p></div>
    {query.error ? <div className="auth-minimal-alert error" role="alert">{query.error}</div> : null}
    {auth ? <form className="auth-minimal-form" action={resetPassword}><div className="auth-minimal-field"><label htmlFor="password">New password</label><input className="auth-minimal-input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div><div className="auth-minimal-field"><label htmlFor="confirmPassword">Confirm new password</label><input className="auth-minimal-input" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></div><SubmitButton className="auth-minimal-submit" pendingLabel="Updating password…">Update password</SubmitButton></form> : <div className="auth-minimal-alert error" role="alert">This page does not have an active recovery session. Request a new link to continue.</div>}
    <p className="auth-minimal-switch">{auth ? <Link href="/login">Cancel</Link> : <Link href="/forgot-password">Request a new recovery link</Link>}</p>
  </div>;
}
