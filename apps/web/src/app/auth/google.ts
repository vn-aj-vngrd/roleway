"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const failure = (message: string) =>
    `/login?${new URLSearchParams({ error: message, next })}`;
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") {
    redirect(
      failure(
        "Google sign-in is not available yet. Use email sign-in for now.",
      ),
    );
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    redirect(
      failure(
        "Google sign-in is temporarily unavailable. Use email sign-in for now.",
      ),
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?provider=google`,
    },
  });
  if (error || !data.url) {
    redirect(
      failure(
        "Google sign-in could not start. Try again or use email sign-in.",
      ),
    );
  }
  const cookieStore = await cookies();
  cookieStore.set("roleway_google_next", next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  redirect(data.url);
}
