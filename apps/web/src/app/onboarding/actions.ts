"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { commaSeparatedList, onboardingFormSchema } from "@/lib/validation";

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      `/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your profile.")}`,
    );

  const auth = await requireUser();
  if (!auth) redirect("/login");

  const { error } = await auth.supabase.rpc("complete_roleway_onboarding", {
    input_full_name: parsed.data.fullName,
    input_headline: parsed.data.headline,
    input_summary: parsed.data.summary,
    input_project_name: parsed.data.projectName,
    input_target_titles: commaSeparatedList(parsed.data.targetTitles),
    input_technologies: commaSeparatedList(parsed.data.technologies),
    input_remote_preference: parsed.data.remotePreference,
    input_locations: commaSeparatedList(parsed.data.locations),
    input_minimum_compensation:
      parsed.data.minimumCompensation === ""
        ? null
        : parsed.data.minimumCompensation,
    input_currency: parsed.data.currency,
  });

  if (error)
    redirect(
      `/onboarding?error=${encodeURIComponent("Your first Workspace could not be created. Try again.")}`,
    );
  await auth.supabase
    .from("profiles")
    .update({ tour_completed: false })
    .eq("user_id", auth.user.id);
  redirect("/home?tour=true");
}
