"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { jobFormSchema } from "@/lib/validation";

const uuid = z.string().uuid();

async function authenticated() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  return auth;
}

export async function createJob(formData: FormData) {
  const parsed = jobFormSchema.safeParse(Object.fromEntries(formData));
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
  const { error } = await auth.supabase.from("jobs").update({ inbox_state: state.data }).eq("id", jobId.data).eq("user_id", auth.user.id);
  if (error) redirect("/jobs?error=The%20job%20could%20not%20be%20updated.");
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
  const parsed = z.object({ opportunityId: z.string().uuid(), stage: z.enum(["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"]), closedReason: z.string().trim().max(120).optional(), returnTo: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.rpc("move_opportunity", { input_opportunity_id: parsed.data.opportunityId, input_stage: parsed.data.stage, input_closed_reason: parsed.data.closedReason || null });
  if (error) {
    const returnTo = parsed.data.returnTo?.startsWith("/") && !parsed.data.returnTo.startsWith("//") ? parsed.data.returnTo : `/opportunities/${parsed.data.opportunityId}`;
    redirect(`${returnTo}?error=${encodeURIComponent(parsed.data.stage === "closed" ? "Choose a reason before closing this Opportunity." : "The stage could not be updated.")}`);
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/", "layout");
}

export async function updateNextAction(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), nextAction: z.string().trim().min(1).max(180), nextActionDueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("opportunities").update({ next_action: parsed.data.nextAction, next_action_due_at: parsed.data.nextActionDueAt ? new Date(parsed.data.nextActionDueAt).toISOString() : null }).eq("id", parsed.data.opportunityId).eq("user_id", auth.user.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20next%20action%20could%20not%20be%20saved.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/today");
}

export async function createTask(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), title: z.string().trim().min(1).max(180), dueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("tasks").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, title: parsed.data.title, category: "admin", due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null });
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20task%20could%20not%20be%20created.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/today");
  revalidatePath("/", "layout");
}

export async function toggleTask(formData: FormData) {
  const taskId = uuid.safeParse(formData.get("taskId"));
  const status = z.enum(["todo", "done"]).safeParse(formData.get("status"));
  const opportunityId = uuid.safeParse(formData.get("opportunityId"));
  if (!taskId.success || !status.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("tasks").update({ status: status.data }).eq("id", taskId.data).eq("user_id", auth.user.id);
  if (error && opportunityId.success) redirect(`/opportunities/${opportunityId.data}?error=The%20task%20could%20not%20be%20updated.`);
  if (opportunityId.success) revalidatePath(`/opportunities/${opportunityId.data}`);
  revalidatePath("/today");
}

export async function createDocument(formData: FormData) {
  const parsed = z.object({ title: z.string().trim().min(1).max(180), kind: z.enum(["resume", "cover_letter", "answer", "message", "research_note", "interview_note"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { data, error } = await auth.supabase.from("documents").insert({ user_id: auth.user.id, title: parsed.data.title, kind: parsed.data.kind, status: "draft" }).select("id").single();
  if (error || !data) redirect("/documents?error=The%20document%20could%20not%20be%20created.");
  revalidatePath("/documents");
  redirect(`/documents/${data.id}`);
}

export async function updateDocument(formData: FormData) {
  const parsed = z.object({ documentId: z.string().uuid(), title: z.string().trim().min(1).max(180), body: z.string().max(100_000), status: z.enum(["draft", "approved", "submitted", "archived"]), opportunityId: z.union([z.literal(""), z.string().uuid()]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/documents/${String(formData.get("documentId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the document.")}`);
  const auth = await authenticated();
  const { error } = await auth.supabase.from("documents").update({ title: parsed.data.title, status: parsed.data.status, opportunity_id: parsed.data.opportunityId || null, content: { body: parsed.data.body } }).eq("id", parsed.data.documentId).eq("user_id", auth.user.id);
  if (error) redirect(`/documents/${parsed.data.documentId}?error=The%20document%20could%20not%20be%20saved.`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${parsed.data.documentId}`);
  redirect(`/documents/${parsed.data.documentId}?saved=true`);
}

export async function deleteDocument(formData: FormData) {
  const documentId = uuid.safeParse(formData.get("documentId"));
  if (!documentId.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("documents").delete().eq("id", documentId.data).eq("user_id", auth.user.id);
  if (error) redirect(`/documents/${documentId.data}?error=The%20document%20could%20not%20be%20deleted.`);
  revalidatePath("/documents");
  redirect("/documents?deleted=true");
}

export async function createInterview(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), interviewType: z.string().trim().min(1).max(120), startsAt: z.string().min(1), durationMinutes: z.coerce.number().int().min(5).max(1440) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("interviews").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, interview_type: parsed.data.interviewType, starts_at: new Date(parsed.data.startsAt).toISOString(), duration_minutes: parsed.data.durationMinutes });
  if (error) redirect("/preparation?error=The%20interview%20could%20not%20be%20scheduled.");
  revalidatePath("/preparation");
  revalidatePath("/today");
  revalidatePath("/", "layout");
  redirect("/preparation?created=true");
}

export async function addNote(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), body: z.string().trim().min(1).max(20_000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("opportunity_notes").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, body: parsed.data.body });
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20note%20could%20not%20be%20added.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
}
