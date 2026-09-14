"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Supabase invitation links may return an implicit session in the URL fragment.
// Exchange it into the existing SSR cookie format before rendering the password form.
export function RecoverySession() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const type = fragment.get("type");
    if (!accessToken || !refreshToken || (type !== "recovery" && type !== "invite")) return;
    window.history.replaceState(null, "", window.location.pathname);
    void createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) setError("That recovery link has expired. Request a new link.");
        else window.location.replace("/reset-password");
      })
      .catch(() => setError("The recovery session could not be opened. Check your connection and request a new link."));
  }, []);
  return <div className="auth-minimal-alert error" role="alert">{error ?? "Open your email recovery link to choose a password. If you just opened it, your secure session is being checked."}</div>;
}
