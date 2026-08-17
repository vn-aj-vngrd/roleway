"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function loginUrl(type: "error" | "message", value: string) {
  return `/login?${type}=${encodeURIComponent(value)}`;
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(loginUrl("error", parsed.error.issues[0]?.message ?? "Check your details."));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(loginUrl("error", "Email or password is incorrect."));
  redirect("/today");
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(loginUrl("error", parsed.error.issues[0]?.message ?? "Check your details."));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) redirect(loginUrl("error", error.message));
  if (!data.session) redirect(loginUrl("error", "Your account was created, but sign-in could not start. Try signing in."));
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=You%20have%20signed%20out.");
}
