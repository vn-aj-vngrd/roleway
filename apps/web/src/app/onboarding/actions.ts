"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { commaSeparatedList, onboardingFormSchema } from "@/lib/validation";

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingFormSchema.safeParse(Object.fromEntries(formData));
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
    target_titles: commaSeparatedList(parsed.data.targetTitles),
    preferred_technologies: commaSeparatedList(parsed.data.technologies),
    remote_preference: parsed.data.remotePreference,
    allowed_locations: commaSeparatedList(parsed.data.locations),
    minimum_compensation: parsed.data.minimumCompensation ?? null,
  });

  const error = profileResult.error ?? preferenceResult.error;
  if (error) redirect(`/onboarding?error=${encodeURIComponent("Profile could not be saved. Try again.")}`);
  redirect("/today?welcome=true");
}
