import { CircleAlert, Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordResetRequestForm } from "@/components/auth-protected-forms";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaUnavailable = process.env.NODE_ENV === "production" && !siteKey;
  return (
    <div className="auth-minimal-form-wrap">
      <div className="auth-minimal-copy">
        <h1>Reset your password</h1>
        <p>
          Enter your account email. If it matches an account, Roleway will send
          a secure recovery link.
        </p>
      </div>
      {query.error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}
      {query.sent ? (
        <Alert role="status">
          <Info aria-hidden="true" />
          <AlertDescription>
            Check your email for a recovery link. It may take a few minutes to
            arrive.
          </AlertDescription>
        </Alert>
      ) : captchaUnavailable ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            Password recovery is unavailable while security verification is
            being configured.
          </AlertDescription>
        </Alert>
      ) : (
        <PasswordResetRequestForm siteKey={siteKey} />
      )}
      <p className="auth-minimal-switch">
        <Link href="/login">Return to login</Link>
      </p>
    </div>
  );
}
