"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  headline: z.string().trim().min(3, "Add a short professional headline.").max(180),
  summary: z.string().trim().max(2000),
  targetTitles: z.string().trim().min(2, "Add at least one target role."),
  technologies: z.string().trim(),
  remotePreference: z.enum(["required", "preferred", "flexible"]),
  locations: z.string().trim(),
  minimumCompensation: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your profile.")}`);

  const auth = await requireUser();
  if (!auth) redirect("/login");

  const profileResult = await auth.supabase.from("profiles").upsert({
    user_id: auth.user.id,
    full_name: parsed.data.fullName,
    headline: parsed.data.headline,
    summary: parsed.data.summary,
    onboarding_completed: true,
  });

  const preferenceResult = await auth.supabase.from("career_preferences").upsert({
    user_id: auth.user.id,
    target_titles: list(parsed.data.targetTitles),
    preferred_technologies: list(parsed.data.technologies),
    remote_preference: parsed.data.remotePreference,
    allowed_locations: list(parsed.data.locations),
    minimum_compensation: parsed.data.minimumCompensation ?? null,
  });

  const error = profileResult.error ?? preferenceResult.error;
  if (error) redirect(`/onboarding?error=${encodeURIComponent("Profile could not be saved. Try again.")}`);
  redirect("/today?welcome=true");
}
