"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

// Process an invitation even when the browser already has another account's session.
// Do not enable password entry until the fragment has been checked.
export function RecoverySession({ children }: { children?: ReactNode }) {
  const started = useRef(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const type = fragment.get("type");
    if (
      !accessToken ||
      !refreshToken ||
      (type !== "recovery" && type !== "invite")
    ) {
      setChecking(false);
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    void createClient()
      .auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError)
          setError("That recovery link has expired. Request a new link.");
        else window.location.replace("/reset-password");
      })
      .catch(() =>
        setError(
          "The recovery session could not be opened. Check your connection and request a new link.",
        ),
      );
  }, []);
  if (error)
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (checking) return <p role="status">Checking your recovery link…</p>;
  return (
    children ?? (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertDescription>
          Open your email recovery link to choose a password, or request a new
          link.
        </AlertDescription>
      </Alert>
    )
  );
}
