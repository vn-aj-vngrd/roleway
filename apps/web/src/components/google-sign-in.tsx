import Image from "next/image";
import { signInWithGoogle } from "@/app/auth/google";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";

export function GoogleSignIn({
  nextPath = "/home",
  showDivider = true,
}: {
  nextPath?: string;
  showDivider?: boolean;
}) {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") return null;
  return (
    <div className="auth-google">
      {showDivider ? (
        <div className="auth-google-divider" aria-hidden="true">
          <span />
          or
          <span />
        </div>
      ) : null}
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={nextPath} />
        <SubmitButton
          variant="outline"
          className="w-full h-11"
          pendingLabel="Opening Google…"
        >
          <Image src="/google-g.svg" alt="" width={18} height={18} />
          Continue with Google <Badge variant="secondary">Beta</Badge>
        </SubmitButton>
      </form>
    </div>
  );
}
