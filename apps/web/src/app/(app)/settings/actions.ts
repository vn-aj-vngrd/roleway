"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(120), headline: z.string().trim().max(180), summary: z.string().trim().max(2000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  const { error } = await auth.supabase.from("profiles").update({ full_name: parsed.data.fullName, headline: parsed.data.headline, summary: parsed.data.summary }).eq("user_id", auth.user.id);
  if (error) redirect("/settings/profile?error=Your%20profile%20could%20not%20be%20saved.");
  revalidatePath("/settings/profile"); revalidatePath("/home");
  redirect("/settings/profile?saved=true");
}

export async function deleteAccount(formData: FormData) {
  const confirmation = z.object({ confirmationName: z.string().trim().min(1), confirmationEmail: z.string().trim().email(), currentPassword: z.string().min(8) }).safeParse(Object.fromEntries(formData));
  const auth = await requireUser(); if (!auth) redirect("/login");
  const { data: profile } = await auth.supabase.from("profiles").select("full_name").eq("user_id", auth.user.id).maybeSingle();
  const expectedName = profile?.full_name || String(auth.user.user_metadata?.full_name || auth.user.email?.split("@")[0] || "Roleway user");
  if (!confirmation.success) redirect("/settings/privacy?error=Complete%20every%20confirmation%20field.");
  const nameMatches = confirmation.data.confirmationName === expectedName;
  const emailMatches = confirmation.data.confirmationEmail.toLowerCase() === auth.user.email?.toLowerCase();
  if (!nameMatches || !emailMatches) redirect("/settings/privacy?error=Your%20name%20and%20email%20must%20match%20the%20account.");
  const { error: verificationError } = await auth.supabase.auth.signInWithPassword({ email: confirmation.data.confirmationEmail, password: confirmation.data.currentPassword });
  if (verificationError) redirect("/settings/privacy?error=Your%20current%20password%20is%20incorrect.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/settings/privacy?error=Account%20deletion%20is%20not%20configured.");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) redirect("/settings/privacy?error=Your%20account%20could%20not%20be%20deleted.%20Try%20again.");
  redirect("/login?message=Your%20Roleway%20account%20and%20workspace%20were%20deleted.");
}

export async function updateNotificationPreferences(formData: FormData) {
  const auth = await requireUser(); if (!auth) redirect("/login");
  const enabled = (name: string) => formData.get(name) === "on";
  const { error } = await auth.supabase.from("notification_preferences").upsert({
    user_id: auth.user.id,
    task_reminders: enabled("taskReminders"),
    interview_reminders: enabled("interviewReminders"),
    pipeline_updates: enabled("pipelineUpdates"),
  });
  if (error) redirect("/settings/notifications?error=Notification%20preferences%20could%20not%20be%20saved.");
  revalidatePath("/settings/notifications");
  redirect("/settings/notifications?saved=true");
}
