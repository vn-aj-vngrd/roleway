"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export async function updateProfile(formData: FormData) {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(120), headline: z.string().trim().max(180), summary: z.string().trim().max(2000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  await auth.supabase.from("profiles").update({ full_name: parsed.data.fullName, headline: parsed.data.headline, summary: parsed.data.summary }).eq("user_id", auth.user.id);
  revalidatePath("/settings/profile"); revalidatePath("/today");
}

export async function updatePreferences(formData: FormData) {
  const parsed = z.object({ targetTitles: z.string(), technologies: z.string(), remotePreference: z.enum(["required", "preferred", "flexible"]), locations: z.string(), minimumCompensation: z.coerce.number().int().min(0).optional(), excludedCriteria: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  await auth.supabase.from("career_preferences").upsert({ user_id: auth.user.id, target_titles: list(parsed.data.targetTitles), preferred_technologies: list(parsed.data.technologies), remote_preference: parsed.data.remotePreference, allowed_locations: list(parsed.data.locations), minimum_compensation: parsed.data.minimumCompensation ?? null, excluded_criteria: list(parsed.data.excludedCriteria) });
  revalidatePath("/settings/preferences");
}
