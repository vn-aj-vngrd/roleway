"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const jobSchema = z.object({
  company: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(100_000),
  location: z.string().trim().max(180),
  compensation: z.string().trim().max(120),
  sourceUrl: z.union([z.literal(""), z.string().url()]),
  applicationUrl: z.union([z.literal(""), z.string().url()]),
  remotePolicy: z.string().trim().max(120),
});

async function authenticated() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  return auth;
}

export async function createJob(formData: FormData) {
  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/jobs?create=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the job details.")}`);
  const auth = await authenticated();
  const { error } = await auth.supabase.from("jobs").insert({
    user_id: auth.user.id,
    company: parsed.data.company,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    compensation: parsed.data.compensation,
    source_url: parsed.data.sourceUrl || null,
    application_url: parsed.data.applicationUrl || null,
    remote_policy: parsed.data.remotePolicy,
    source: parsed.data.sourceUrl ? "URL import" : "Manual",
  });
  if (error) redirect(`/jobs?create=true&error=${encodeURIComponent("The job could not be saved.")}`);
  revalidatePath("/jobs");
  redirect("/jobs?created=true");
}

export async function setJobInboxState(formData: FormData) {
  const jobId = uuid.safeParse(formData.get("jobId"));
  const state = z.enum(["maybe", "dismissed"]).safeParse(formData.get("state"));
  if (!jobId.success || !state.success) return;
  const auth = await authenticated();
  await auth.supabase.from("jobs").update({ inbox_state: state.data }).eq("id", jobId.data).eq("user_id", auth.user.id);
  revalidatePath("/jobs");
}

export async function trackJob(formData: FormData) {
  const jobId = uuid.safeParse(formData.get("jobId"));
  if (!jobId.success) return;
  const auth = await authenticated();
  const { data, error } = await auth.supabase.rpc("track_job", { input_job_id: jobId.data });
  if (error || !data) redirect("/jobs?error=The%20job%20could%20not%20be%20tracked.");
  revalidatePath("/jobs");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data}`);
}

export async function updateOpportunityStage(formData: FormData) {
  const opportunityId = uuid.safeParse(formData.get("opportunityId"));
  const stage = z.enum(["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"]).safeParse(formData.get("stage"));
  if (!opportunityId.success || !stage.success) return;
  const auth = await authenticated();
  const values = stage.data === "closed" ? { stage: stage.data, closed_reason: "Closed by user" } : { stage: stage.data, closed_reason: null };
  const { error } = await auth.supabase.from("opportunities").update(values).eq("id", opportunityId.data).eq("user_id", auth.user.id);
  if (!error) await auth.supabase.from("opportunity_events").insert({ user_id: auth.user.id, opportunity_id: opportunityId.data, actor: "user", event_type: "stage_changed", payload: { stage: stage.data } });
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId.data}`);
}

export async function updateNextAction(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), nextAction: z.string().trim().min(1).max(180), nextActionDueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  await auth.supabase.from("opportunities").update({ next_action: parsed.data.nextAction, next_action_due_at: parsed.data.nextActionDueAt ? new Date(parsed.data.nextActionDueAt).toISOString() : null }).eq("id", parsed.data.opportunityId).eq("user_id", auth.user.id);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/today");
}

export async function createTask(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), title: z.string().trim().min(1).max(180), dueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  await auth.supabase.from("tasks").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, title: parsed.data.title, category: "admin", due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null });
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/today");
}

export async function toggleTask(formData: FormData) {
  const taskId = uuid.safeParse(formData.get("taskId"));
  const status = z.enum(["todo", "done"]).safeParse(formData.get("status"));
  const opportunityId = uuid.safeParse(formData.get("opportunityId"));
  if (!taskId.success || !status.success) return;
  const auth = await authenticated();
  await auth.supabase.from("tasks").update({ status: status.data }).eq("id", taskId.data).eq("user_id", auth.user.id);
  if (opportunityId.success) revalidatePath(`/opportunities/${opportunityId.data}`);
  revalidatePath("/today");
}

export async function createDocument(formData: FormData) {
  const parsed = z.object({ title: z.string().trim().min(1).max(180), kind: z.enum(["resume", "cover_letter", "answer", "message", "research_note", "interview_note"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  await auth.supabase.from("documents").insert({ user_id: auth.user.id, title: parsed.data.title, kind: parsed.data.kind, status: "draft" });
  revalidatePath("/documents");
}

export async function createInterview(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), interviewType: z.string().trim().min(1).max(120), startsAt: z.string().min(1), durationMinutes: z.coerce.number().int().min(5).max(1440) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  await auth.supabase.from("interviews").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, interview_type: parsed.data.interviewType, starts_at: new Date(parsed.data.startsAt).toISOString(), duration_minutes: parsed.data.durationMinutes });
  revalidatePath("/preparation");
  revalidatePath("/today");
}

export async function addNote(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), body: z.string().trim().min(1).max(20_000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  await auth.supabase.from("opportunity_notes").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, body: parsed.data.body });
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
}
