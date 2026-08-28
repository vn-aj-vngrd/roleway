"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { formDateTimeToIso } from "@/lib/datetime";
import { recordSystemEvent } from "@/lib/observability";
import { sanitizeRichText } from "@/lib/rich-text";
import { jobFormSchema } from "@/lib/validation";

const uuid = z.string().uuid();

async function authenticated() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  return { ...context, project: context.project };
}

export async function createJob(formData: FormData) {
  const parsed = jobFormSchema.safeParse(Object.fromEntries(formData));
  const projectId = uuid.safeParse(formData.get("projectId"));
  const errorHref = (message: string) => `/inbox?create=true${projectId.success ? `&projectId=${projectId.data}` : ""}&error=${encodeURIComponent(message)}`;
  if (!parsed.success) redirect(errorHref(parsed.error.issues[0]?.message ?? "Check the job details."));
  if (!projectId.success) redirect(errorHref("Choose a workspace for this job."));
  const auth = await authenticated();
  const project = auth.projects.find((candidate) => candidate.id === projectId.data);
  if (!project) redirect(errorHref("That workspace is no longer available."));
  if (parsed.data.sourceUrl) {
    const { data: duplicate } = await auth.supabase.from("jobs").select("id, inbox_state").eq("project_id", project.id).eq("source_url", parsed.data.sourceUrl).maybeSingle();
    if (duplicate) redirect(errorHref(`That job URL is already saved in ${project.name}.`));
  }
  const { error } = await auth.supabase.from("jobs").insert({
    user_id: auth.user.id,
    project_id: project.id,
    company: parsed.data.company,
    title: parsed.data.title,
    description: sanitizeRichText(parsed.data.description),
    location: parsed.data.location,
    compensation: parsed.data.compensation,
    source_url: parsed.data.sourceUrl || null,
    application_url: parsed.data.applicationUrl || null,
    remote_policy: parsed.data.remotePolicy,
    date_posted: parsed.data.datePosted || null,
    source: parsed.data.sourceUrl ? new URL(parsed.data.sourceUrl).hostname.replace(/^www\./, "") : "Manual",
  });
  if (error) {
    await recordSystemEvent({ category: "job_capture", code: "job_insert_failed", userId: auth.user.id, metadata: { databaseCode: error.code ?? "unknown" } });
    redirect(errorHref("The job could not be saved."));
  }
  if (project.id !== auth.project.id) await auth.supabase.rpc("set_active_search_project", { input_project_id: project.id });
  revalidatePath("/", "layout");
  revalidatePath("/inbox");
  redirect("/inbox?created=true");
}

export async function setJobInboxState(formData: FormData) {
  const jobId = uuid.safeParse(formData.get("jobId"));
  const state = z.enum(["maybe", "dismissed"]).safeParse(formData.get("state"));
  const reviewAt = z.union([z.literal(""), z.string().date()]).safeParse(formData.get("reviewAt") ?? "");
  if (!jobId.success || !state.success || !reviewAt.success) return;
  if (state.data === "maybe" && !reviewAt.data) redirect("/inbox?error=Choose%20when%20this%20Job%20should%20return.");
  const auth = await authenticated();
  const { error } = await auth.supabase.from("jobs").update({
    inbox_state: state.data,
    inbox_review_at: state.data === "maybe" ? `${reviewAt.data}T09:00:00.000Z` : null,
  }).eq("id", jobId.data).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error) redirect("/inbox?error=The%20Job%20could%20not%20be%20updated.");
  revalidatePath("/inbox");
  revalidatePath("/home");
}

export async function trackJob(formData: FormData) {
  const jobId = uuid.safeParse(formData.get("jobId"));
  if (!jobId.success) return;
  const auth = await authenticated();
  const { data: job } = await auth.supabase.from("jobs").select("id").eq("id", jobId.data).eq("project_id", auth.project.id).maybeSingle();
  if (!job) redirect("/inbox?error=That%20job%20is%20not%20part%20of%20this%20workspace.");
  const { data, error } = await auth.supabase.rpc("track_job", { input_job_id: jobId.data });
  if (error || !data) {
    await recordSystemEvent({ category: "opportunity", code: "track_job_failed", userId: auth.user.id, metadata: { databaseCode: error?.code ?? "missing_result" } });
    redirect("/inbox?error=The%20job%20could%20not%20be%20tracked.");
  }
  revalidatePath("/inbox");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data}`);
}

export async function updateOpportunityStage(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), stage: z.enum(["interested", "preparing", "applied", "interview", "offer", "closed"]), closedReason: z.string().trim().max(120).optional(), returnTo: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/opportunities?error=The%20stage%20change%20was%20not%20valid.");
  const auth = await authenticated();
  const { data: opportunity } = await auth.supabase.from("opportunities").select("id").eq("id", parsed.data.opportunityId).eq("project_id", auth.project.id).maybeSingle();
  if (!opportunity) redirect("/opportunities?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.");
  const { error } = await auth.supabase.rpc("move_opportunity", { input_opportunity_id: parsed.data.opportunityId, input_stage: parsed.data.stage, input_closed_reason: parsed.data.closedReason || null });
  if (error) {
    const returnTo = parsed.data.returnTo?.startsWith("/") && !parsed.data.returnTo.startsWith("//") ? parsed.data.returnTo : `/opportunities/${parsed.data.opportunityId}`;
    redirect(`${returnTo}?error=${encodeURIComponent(parsed.data.stage === "closed" ? "Choose a reason before closing this Opportunity." : "The stage could not be updated.")}`);
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
}

export async function updateOpportunityDetails(formData: FormData) {
  const parsed = z.object({
    opportunityId: z.string().uuid(),
    jobId: z.string().uuid(),
    company: z.string().trim().min(1).max(180),
    title: z.string().trim().min(1).max(180),
    location: z.string().trim().max(180),
    compensation: z.string().trim().max(180),
    remotePolicy: z.string().trim().max(120),
    source: z.string().trim().min(1).max(120).optional(),
    sourceUrl: z.union([z.literal(""), z.string().url()]),
    applicationUrl: z.union([z.literal(""), z.string().url()]),
    description: z.string().trim().max(100_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/opportunities/${String(formData.get("opportunityId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the role details.")}`);
  const auth = await authenticated();
  const { data: opportunity } = await auth.supabase.from("opportunities").select("job_id").eq("id", parsed.data.opportunityId).eq("user_id", auth.user.id).eq("project_id", auth.project.id).maybeSingle();
  if (!opportunity || opportunity.job_id !== parsed.data.jobId) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20linked%20job%20could%20not%20be%20verified.`);
  const { error } = await auth.supabase.from("jobs").update({
    company: parsed.data.company,
    title: parsed.data.title,
    location: parsed.data.location,
    compensation: parsed.data.compensation,
    remote_policy: parsed.data.remotePolicy,
    ...(parsed.data.source ? { source: parsed.data.source } : {}),
    source_url: parsed.data.sourceUrl || null,
    application_url: parsed.data.applicationUrl || null,
    description: sanitizeRichText(parsed.data.description),
  }).eq("id", parsed.data.jobId).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20role%20details%20could%20not%20be%20updated.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/inbox");
  revalidatePath("/opportunities");
}

export async function updateNextAction(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), nextAction: z.string().trim().min(1).max(180), nextActionDueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/opportunities/${String(formData.get("opportunityId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Add a concrete Next Action.")}`);
  const auth = await authenticated();
  let nextActionDueAt: string | null;
  try { nextActionDueAt = formDateTimeToIso(formData, "nextActionDueAt"); }
  catch (error) { redirect(`/opportunities/${parsed.data.opportunityId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Check the Next Action due date.")}`); }
  const { error } = await auth.supabase.from("opportunities").update({ next_action: parsed.data.nextAction, next_action_due_at: nextActionDueAt }).eq("id", parsed.data.opportunityId).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20next%20action%20could%20not%20be%20saved.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
}

export async function createTask(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), title: z.string().trim().min(1).max(180), dueAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/opportunities/${String(formData.get("opportunityId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the task details.")}`);
  const auth = await authenticated();
  let dueAt: string | null;
  try { dueAt = formDateTimeToIso(formData, "dueAt"); }
  catch (error) { redirect(`/opportunities/${parsed.data.opportunityId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Check the task due date.")}`); }
  const { error } = await auth.supabase.from("tasks").insert({ user_id: auth.user.id, project_id: auth.project.id, opportunity_id: parsed.data.opportunityId, title: parsed.data.title, category: "admin", due_at: dueAt });
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20task%20could%20not%20be%20created.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
}

export async function toggleTask(formData: FormData) {
  const taskId = uuid.safeParse(formData.get("taskId"));
  const status = z.enum(["todo", "done"]).safeParse(formData.get("status"));
  const opportunityId = uuid.safeParse(formData.get("opportunityId"));
  if (!taskId.success || !status.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("tasks").update({ status: status.data }).eq("id", taskId.data).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error && opportunityId.success) redirect(`/opportunities/${opportunityId.data}?error=The%20task%20could%20not%20be%20updated.`);
  if (opportunityId.success) revalidatePath(`/opportunities/${opportunityId.data}`);
  revalidatePath("/home");
}

export async function createDocument(formData: FormData) {
  const parsed = z.object({ title: z.string().trim().min(1).max(180), kind: z.enum(["resume", "cover_letter", "answer", "message", "research_note", "interview_note"]), opportunityId: z.union([z.literal(""), z.string().uuid()]).default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/documents?create=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the document details.")}`);
  const auth = await authenticated();
  if (parsed.data.opportunityId) {
    const { data: opportunity } = await auth.supabase.from("opportunities").select("id").eq("id", parsed.data.opportunityId).eq("project_id", auth.project.id).maybeSingle();
    if (!opportunity) redirect("/documents?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.");
  }
  const { data, error } = await auth.supabase.from("documents").insert({ user_id: auth.user.id, project_id: auth.project.id, opportunity_id: parsed.data.opportunityId || null, title: parsed.data.title, kind: parsed.data.kind, status: "draft" }).select("id").single();
  if (error || !data) redirect("/documents?error=The%20document%20could%20not%20be%20created.");
  revalidatePath("/documents");
  redirect(`/documents/${data.id}`);
}

export async function updateDocument(formData: FormData) {
  const parsed = z.object({ documentId: z.string().uuid(), title: z.string().trim().min(1).max(180), body: z.string().max(100_000), status: z.enum(["draft", "approved", "submitted", "archived"]), opportunityId: z.union([z.literal(""), z.string().uuid()]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/documents/${String(formData.get("documentId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the document.")}`);
  const auth = await authenticated();
  if (parsed.data.opportunityId) {
    const { data: opportunity } = await auth.supabase.from("opportunities").select("id").eq("id", parsed.data.opportunityId).eq("project_id", auth.project.id).maybeSingle();
    if (!opportunity) redirect(`/documents/${parsed.data.documentId}?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.`);
  }
  const { error } = await auth.supabase.from("documents").update({ title: parsed.data.title, status: parsed.data.status, opportunity_id: parsed.data.opportunityId || null, content: { body: parsed.data.body } }).eq("id", parsed.data.documentId).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error) redirect(`/documents/${parsed.data.documentId}?error=The%20document%20could%20not%20be%20saved.`);
  revalidatePath("/documents");
  revalidatePath(`/documents/${parsed.data.documentId}`);
  redirect(`/documents/${parsed.data.documentId}?saved=true`);
}

export async function deleteDocument(formData: FormData) {
  const documentId = uuid.safeParse(formData.get("documentId"));
  if (!documentId.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("documents").delete().eq("id", documentId.data).eq("user_id", auth.user.id).eq("project_id", auth.project.id);
  if (error) redirect(`/documents/${documentId.data}?error=The%20document%20could%20not%20be%20deleted.`);
  revalidatePath("/documents");
  redirect("/documents?deleted=true");
}

export async function createInterview(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), interviewType: z.string().trim().min(1).max(120), startsAt: z.string().min(1), durationMinutes: z.coerce.number().int().min(5).max(1440), meetingUrl: z.union([z.literal(""), z.string().url()]).default(""), timezone: z.string().trim().min(1).max(80).default("UTC"), interviewers: z.string().trim().max(2000).default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/interview?create=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the interview details.")}`);
  const auth = await authenticated();
  const { data: opportunity } = await auth.supabase.from("opportunities").select("id").eq("id", parsed.data.opportunityId).eq("project_id", auth.project.id).maybeSingle();
  if (!opportunity) redirect("/interview?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.");
  let startsAt: string;
  try { startsAt = formDateTimeToIso(formData, "startsAt", parsed.data.timezone)!; }
  catch (error) { redirect(`/interview?create=true&opportunity=${parsed.data.opportunityId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Check the interview time and timezone.")}`); }
  const { data: interviewId, error } = await auth.supabase.rpc("schedule_interview", { input_opportunity_id: parsed.data.opportunityId, input_interview_type: parsed.data.interviewType, input_starts_at: startsAt, input_duration_minutes: parsed.data.durationMinutes, input_meeting_url: parsed.data.meetingUrl || null, input_timezone: parsed.data.timezone, input_interviewers: parsed.data.interviewers });
  if (error || !interviewId) {
    await recordSystemEvent({ category: "interview", code: "schedule_interview_failed", userId: auth.user.id, metadata: { databaseCode: error?.code ?? "missing_result" } });
    redirect("/interview?error=The%20interview%20could%20not%20be%20scheduled.");
  }
  revalidatePath("/interview");
  revalidatePath("/home");
  redirect(`/interview/${interviewId}?created=true`);
}

export async function addNote(formData: FormData) {
  const parsed = z.object({ opportunityId: z.string().uuid(), body: z.string().trim().min(1).max(20_000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/opportunities/${String(formData.get("opportunityId"))}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the note.")}`);
  const auth = await authenticated();
  const { data: opportunity } = await auth.supabase.from("opportunities").select("id").eq("id", parsed.data.opportunityId).eq("project_id", auth.project.id).maybeSingle();
  if (!opportunity) redirect("/opportunities?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.");
  const { error } = await auth.supabase.from("opportunity_notes").insert({ user_id: auth.user.id, opportunity_id: parsed.data.opportunityId, body: parsed.data.body });
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20note%20could%20not%20be%20added.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
}
