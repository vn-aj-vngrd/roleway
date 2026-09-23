import { CircleAlert, CircleCheck, TriangleAlert, Info } from "lucide-react";
import Link from "next/link";
import { EmailConfirmationForm } from "@/components/auth-protected-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const query = await searchParams;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const unavailable = process.env.NODE_ENV === "production" && !siteKey;
  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Verify your email</h1>
        <p>
          Open the confirmation link in your email to activate your Roleway
          account. You must verify before logging in.
        </p>
      </div>
      {query.sent ? (
        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <AlertDescription>
            If your account needs verification, a confirmation email has been
            requested. Check your inbox and spam folder. Links expire after one
            hour.
          </AlertDescription>
        </Alert>
      ) : null}
      {query.error ? (
        <Alert variant="danger">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}
      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertDescription>
          Missing the email? Check the address below and wait a minute before
          requesting another link.
        </AlertDescription>
      </Alert>
      {unavailable ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>
            Email verification is temporarily unavailable.
          </AlertDescription>
        </Alert>
      ) : (
        <EmailConfirmationForm siteKey={siteKey} />
      )}
      <p className="auth-minimal-switch">
        Already verified? <Link href="/login">Log in</Link> ·{" "}
        <Link href="/signup">Use a different email</Link>
      </p>
    </div>
  );
}
