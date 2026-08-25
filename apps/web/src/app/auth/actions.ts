"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function authUrl(route: "/login" | "/signup", type: "error" | "message", value: string, requestedNext?: FormDataEntryValue | null) {
  const safeNext = safeNextPath(requestedNext, "");
  const next = safeNext ? `&next=${encodeURIComponent(safeNext)}` : "";
  return `${route}?${type}=${encodeURIComponent(value)}${next}`;
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(authUrl("/login", "error", parsed.error.issues[0]?.message ?? "Check your details.", formData.get("next")));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) redirect(authUrl("/login", "error", "Email or password is incorrect.", formData.get("next")));
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", data.user.id).maybeSingle();
  if (!profile?.onboarding_completed) redirect("/onboarding");
  const requestedNext = formData.get("next");
  const next = safeNextPath(requestedNext);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(authUrl("/signup", "error", parsed.error.issues[0]?.message ?? "Check your details."));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) redirect(authUrl("/signup", "error", error.message));
  if (!data.session) redirect(authUrl("/login", "message", "Your account was created. Check your email, then log in."));
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=You%20have%20signed%20out.");
}
