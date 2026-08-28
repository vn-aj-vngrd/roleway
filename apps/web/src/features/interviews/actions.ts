"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { formDateTimeToIso } from "@/lib/datetime";

const interviewSchema = z.object({
  interviewId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  interviewType: z.string().trim().min(1).max(120),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  meetingUrl: z.union([z.literal(""), z.string().url("Enter a valid meeting URL.")]),
  timezone: z.string().trim().min(1).max(80),
  interviewers: z.string().trim().max(2000),
  preparationNotes: z.string().trim().max(30_000),
  questionsToAsk: z.string().trim().max(30_000),
  notes: z.string().trim().max(30_000),
  outcome: z.string().trim().max(500),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

async function context() {
  const value = await requireSearchContext();
  if (!value) redirect("/login");
  if (!value.project) redirect("/onboarding");
  return { ...value, project: value.project };
}

export async function updateInterview(formData: FormData) {
  const parsed = interviewSchema.safeParse(Object.fromEntries(formData));
  const fallbackId = String(formData.get("interviewId") ?? "");
  if (!parsed.success) redirect(`/interview/${fallbackId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the interview details.")}`);
  const active = await context();
  const { data: existing } = await active.supabase
    .from("interviews")
    .select("status, opportunity_id")
    .eq("id", parsed.data.interviewId)
    .eq("project_id", active.project.id)
    .maybeSingle();
  if (!existing || existing.opportunity_id !== parsed.data.opportunityId) redirect("/interview?error=That%20interview%20is%20not%20part%20of%20this%20workspace.");

  let startsAt: string;
  try { startsAt = formDateTimeToIso(formData, "startsAt", parsed.data.timezone)!; }
  catch (error) { redirect(`/interview/${parsed.data.interviewId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Check the interview time and timezone.")}`); }
  const { error } = await active.supabase.from("interviews").update({
    interview_type: parsed.data.interviewType,
    starts_at: startsAt,
    duration_minutes: parsed.data.durationMinutes,
    meeting_url: parsed.data.meetingUrl || null,
    timezone: parsed.data.timezone,
    interviewers: parsed.data.interviewers,
    preparation_notes: parsed.data.preparationNotes,
    questions_to_ask: parsed.data.questionsToAsk,
    notes: parsed.data.notes,
    outcome: parsed.data.outcome || null,
    status: parsed.data.status,
  }).eq("id", parsed.data.interviewId).eq("user_id", active.user.id).eq("project_id", active.project.id);
  if (error) redirect(`/interview/${parsed.data.interviewId}?error=The%20interview%20could%20not%20be%20saved.`);

  if (parsed.data.status === "completed" && existing.status !== "completed") {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await Promise.all([
      active.supabase.from("opportunity_events").insert({ user_id: active.user.id, opportunity_id: parsed.data.opportunityId, actor: "user", event_type: "interview_completed", payload: { interview_id: parsed.data.interviewId, outcome: parsed.data.outcome || null } }),
      active.supabase.from("opportunities").update({ next_action: "Send interview follow-up", next_action_due_at: tomorrow.toISOString() }).eq("id", parsed.data.opportunityId).eq("project_id", active.project.id),
      active.supabase.from("tasks").insert({ user_id: active.user.id, project_id: active.project.id, opportunity_id: parsed.data.opportunityId, title: "Send interview follow-up", category: "follow-up", priority: "high", due_at: tomorrow.toISOString(), created_by: "system" }),
    ]);
  }

  revalidatePath(`/interview/${parsed.data.interviewId}`);
  revalidatePath("/interview");
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
  redirect(`/interview/${parsed.data.interviewId}?saved=true`);
}

export async function deleteInterview(formData: FormData) {
  const parsed = z.object({ interviewId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = await context();
  const { data: interview } = await active.supabase.from("interviews").select("interview_type, starts_at").eq("id", parsed.data.interviewId).eq("opportunity_id", parsed.data.opportunityId).eq("project_id", active.project.id).maybeSingle();
  if (!interview) redirect("/interview?error=The%20interview%20could%20not%20be%20found.");
  const { error } = await active.supabase.from("interviews").delete().eq("id", parsed.data.interviewId).eq("user_id", active.user.id).eq("project_id", active.project.id);
  if (error) redirect(`/interview/${parsed.data.interviewId}?error=The%20interview%20could%20not%20be%20deleted.`);
  await active.supabase.from("opportunity_events").insert({ user_id: active.user.id, opportunity_id: parsed.data.opportunityId, actor: "user", event_type: "interview_cancelled", payload: { interview_type: interview.interview_type, starts_at: interview.starts_at } });
  revalidatePath("/interview");
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
  redirect("/interview?deleted=true");
}
