import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient, requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Create an account" };

export default async function SignupPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (auth) redirect("/home");

  const supabase = await createClient();
  const { data: admission, error: admissionError } = await supabase.rpc("signup_admission_status");
  const productionUnavailable = process.env.NODE_ENV === "production" && (admissionError || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const acceptingSignups = !productionUnavailable && (admission?.acceptingSignups ?? process.env.NODE_ENV !== "production");
  const closedMessage = admission?.registrationEnabled === false
    ? "New registrations are temporarily paused."
    : "Roleway has reached its current account limit.";

  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Create your Roleway account</h1>
        <p>Start one focused workspace for your job search.</p>
      </div>
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error}</AlertDescription></Alert> : null}
      {productionUnavailable ? <Alert variant="destructive"><AlertDescription>Registration is unavailable while security verification is being configured.</AlertDescription></Alert> : null}
      {!productionUnavailable && !acceptingSignups ? <Alert><AlertDescription>{closedMessage}</AlertDescription></Alert> : null}
      {acceptingSignups ? <SignupForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /> : null}
      <p className="auth-minimal-switch">Already have an account? <Link href="/login">Log in</Link></p>
      <p className="auth-minimal-terms">By continuing, you agree to keep your account secure. Read our <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
