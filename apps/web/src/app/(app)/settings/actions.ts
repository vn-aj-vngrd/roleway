"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export async function updateProfile(formData: FormData) {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(120), headline: z.string().trim().max(180), summary: z.string().trim().max(2000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  const { error } = await auth.supabase.from("profiles").update({ full_name: parsed.data.fullName, headline: parsed.data.headline, summary: parsed.data.summary }).eq("user_id", auth.user.id);
  if (error) redirect("/settings/profile?error=Your%20profile%20could%20not%20be%20saved.");
  revalidatePath("/settings/profile"); revalidatePath("/today");
  redirect("/settings/profile?saved=true");
}

export async function deleteAccount(formData: FormData) {
  const confirmation = z.literal("DELETE").safeParse(formData.get("confirmation"));
  if (!confirmation.success) redirect("/settings/privacy?error=Type%20DELETE%20to%20confirm%20account%20deletion.");
  const auth = await requireUser(); if (!auth) redirect("/login");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/settings/privacy?error=Account%20deletion%20is%20not%20configured.");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) redirect("/settings/privacy?error=Your%20account%20could%20not%20be%20deleted.%20Try%20again.");
  redirect("/login?message=Your%20Roleway%20account%20and%20workspace%20were%20deleted.");
}

export async function updatePreferences(formData: FormData) {
  const parsed = z.object({ targetTitles: z.string(), technologies: z.string(), remotePreference: z.enum(["required", "preferred", "flexible"]), locations: z.string(), minimumCompensation: z.union([z.literal(""), z.coerce.number().int().min(0)]), currency: z.string().trim().length(3), excludedCriteria: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  const { error } = await auth.supabase.from("career_preferences").upsert({ user_id: auth.user.id, target_titles: list(parsed.data.targetTitles), preferred_technologies: list(parsed.data.technologies), remote_preference: parsed.data.remotePreference, allowed_locations: list(parsed.data.locations), minimum_compensation: parsed.data.minimumCompensation === "" ? null : parsed.data.minimumCompensation, currency: parsed.data.currency.toUpperCase(), excluded_criteria: list(parsed.data.excludedCriteria) });
  if (error) redirect("/settings/preferences?error=Your%20preferences%20could%20not%20be%20saved.");
  revalidatePath("/settings/preferences");
  redirect("/settings/preferences?saved=true");
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
