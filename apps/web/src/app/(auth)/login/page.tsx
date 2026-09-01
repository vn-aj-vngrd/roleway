import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-protected-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

export default async function LoginPage(
  props: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }
) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/home");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaUnavailable = process.env.NODE_ENV === "production" && !siteKey;

  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Log in to Roleway</h1>
        <p>Continue to your focused job search.</p>
      </div>
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert> : null}
      {query.message ? <Alert role="status"><AlertDescription>{query.message}</AlertDescription></Alert> : null}
      {captchaUnavailable ? <Alert variant="destructive"><AlertDescription>Login is unavailable while security verification is being configured.</AlertDescription></Alert> : <LoginForm siteKey={siteKey} nextPath={query.next ?? ""} />}
      <p className="auth-minimal-switch">New to Roleway? <Link href="/signup">Create an account</Link></p>
      <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
