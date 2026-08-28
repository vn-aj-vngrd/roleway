import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams;
  return <div className="auth-minimal-form-wrap">
    <div className="auth-minimal-copy"><h1>Reset your password</h1><p>Enter your account email. If it matches an account, Roleway will send a secure recovery link.</p></div>
    {query.error ? <div className="auth-minimal-alert error" role="alert">{query.error}</div> : null}
    {query.sent ? <div className="auth-minimal-alert success" role="status">Check your email for a recovery link. It may take a few minutes to arrive.</div> : <form className="auth-minimal-form" action={requestPasswordReset}><div className="auth-minimal-field"><label htmlFor="email">Email</label><input className="auth-minimal-input" id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" /></div><SubmitButton className="auth-minimal-submit" pendingLabel="Sending recovery link…">Send recovery link</SubmitButton></form>}
    <p className="auth-minimal-switch"><Link href="/login">Return to login</Link></p>
  </div>;
}
