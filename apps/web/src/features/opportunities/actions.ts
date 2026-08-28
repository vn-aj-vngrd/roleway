"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { formDateTimeToIso } from "@/lib/datetime";
import { recordSystemEvent } from "@/lib/observability";

const optionalUrl = z.union([z.literal(""), z.string().url()]);
const optionalEmail = z.union([z.literal(""), z.string().email()]);
const optionalUuid = z.union([z.literal(""), z.string().uuid()]);

async function context() {
  const value = await requireSearchContext();
  if (!value) redirect("/login");
  if (!value.project) redirect("/onboarding");
  return { ...value, project: value.project };
}

async function ownsOpportunity(opportunityId: string) {
  const active = await context();
  const { data } = await active.supabase.from("opportunities").select("id").eq("id", opportunityId).eq("project_id", active.project.id).maybeSingle();
  if (!data) redirect("/opportunities?error=That%20opportunity%20is%20not%20part%20of%20this%20workspace.");
  return active;
}

export async function submitApplication(formData: FormData) {
  const parsed = z.object({
    opportunityId: z.string().uuid(),
    submittedAt: z.string().min(1),
    channel: z.enum(["company_site", "job_board", "email", "referral", "other"]),
    confirmationReference: z.string().trim().max(500),
    resumeDocumentId: optionalUuid,
    coverLetterDocumentId: optionalUuid,
    portfolioUrl: optionalUrl,
    salaryExpectation: z.string().trim().max(500),
    notes: z.string().trim().max(10_000),
  }).safeParse(Object.fromEntries(formData));
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!parsed.success) redirect(`/opportunities/${opportunityId}?apply=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the submission details.")}`);
  const active = await ownsOpportunity(parsed.data.opportunityId);
  let submittedAt: string;
  try { submittedAt = formDateTimeToIso(formData, "submittedAt")!; }
  catch (error) { redirect(`/opportunities/${parsed.data.opportunityId}?apply=true&error=${encodeURIComponent(error instanceof Error ? error.message : "Check the submission time.")}`); }
  const { error } = await active.supabase.rpc("submit_application", {
    input_opportunity_id: parsed.data.opportunityId,
    input_submitted_at: submittedAt,
    input_channel: parsed.data.channel,
    input_confirmation_reference: parsed.data.confirmationReference,
    input_resume_document_id: parsed.data.resumeDocumentId || null,
    input_cover_letter_document_id: parsed.data.coverLetterDocumentId || null,
    input_portfolio_url: parsed.data.portfolioUrl || null,
    input_salary_expectation: parsed.data.salaryExpectation,
    input_notes: parsed.data.notes,
  });
  if (error) {
    await recordSystemEvent({ category: "application", code: "submit_application_failed", userId: active.user.id, metadata: { databaseCode: error.code ?? "unknown" } });
    redirect(`/opportunities/${parsed.data.opportunityId}?apply=true&error=The%20application%20record%20could%20not%20be%20saved.`);
  }
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/opportunities");
  revalidatePath("/home");
  revalidatePath("/insights");
  redirect(`/opportunities/${parsed.data.opportunityId}?applied=true`);
}

export async function updateOpportunityAssessment(formData: FormData) {
  const parsed = z.object({
    opportunityId: z.string().uuid(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    excitement: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]),
    deadline: z.union([z.literal(""), z.string().date()]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = await ownsOpportunity(parsed.data.opportunityId);
  const { error } = await active.supabase.from("opportunities").update({
    priority: parsed.data.priority,
    excitement: parsed.data.excitement === "" ? null : parsed.data.excitement,
    deadline: parsed.data.deadline || null,
  }).eq("id", parsed.data.opportunityId).eq("project_id", active.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=Priority%20and%20decision%20criteria%20could%20not%20be%20saved.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/opportunities");
  redirect(`/opportunities/${parsed.data.opportunityId}?assessmentSaved=true`);
}

const contactSchema = z.object({
  contactId: z.string().uuid().optional(),
  opportunityId: z.string().uuid(),
  name: z.string().trim().min(1, "Add the contact’s name.").max(160),
  role: z.string().trim().max(180),
  company: z.string().trim().max(160),
  relationship: z.enum(["recruiter", "hiring_manager", "interviewer", "referral", "colleague", "contact"]),
  email: optionalEmail,
  phone: z.string().trim().max(80),
  profileUrl: optionalUrl,
  notes: z.string().trim().max(20_000),
  followUpAt: z.string().optional(),
});

function contactPayload(data: z.infer<typeof contactSchema>) {
  return {
    name: data.name,
    role: data.role,
    company: data.company,
    relationship: data.relationship,
    email: data.email || null,
    phone: data.phone || null,
    profile_url: data.profileUrl || null,
    notes: data.notes,
    follow_up_at: data.followUpAt || null,
  };
}

export async function createContact(formData: FormData) {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!parsed.success) redirect(`/opportunities/${opportunityId}?contact=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the contact details.")}`);
  const active = await ownsOpportunity(parsed.data.opportunityId);
  let followUpAt: string | null;
  try { followUpAt = formDateTimeToIso(formData, "followUpAt"); }
  catch (error) { redirect(`/opportunities/${parsed.data.opportunityId}?contact=true&error=${encodeURIComponent(error instanceof Error ? error.message : "Check the follow-up time.")}`); }
  const { data, error } = await active.supabase.from("contacts").insert({
    user_id: active.user.id,
    project_id: active.project.id,
    opportunity_id: parsed.data.opportunityId,
    ...contactPayload({ ...parsed.data, followUpAt: followUpAt ?? "" }),
  }).select("id").single();
  if (error || !data) redirect(`/opportunities/${parsed.data.opportunityId}?contact=true&error=The%20contact%20could%20not%20be%20saved.`);
  await active.supabase.from("opportunity_events").insert({ user_id: active.user.id, opportunity_id: parsed.data.opportunityId, actor: "user", event_type: "contact_added", payload: { contact_id: data.id, name: parsed.data.name, relationship: parsed.data.relationship } });
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
  redirect(`/opportunities/${parsed.data.opportunityId}?contactCreated=true`);
}

export async function updateContact(formData: FormData) {
  const parsed = contactSchema.required({ contactId: true }).safeParse(Object.fromEntries(formData));
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!parsed.success) redirect(`/opportunities/${opportunityId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the contact details.")}`);
  const active = await ownsOpportunity(parsed.data.opportunityId);
  let followUpAt: string | null;
  try { followUpAt = formDateTimeToIso(formData, "followUpAt"); }
  catch (error) { redirect(`/opportunities/${parsed.data.opportunityId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Check the follow-up time.")}`); }
  const { error } = await active.supabase.from("contacts").update(contactPayload({ ...parsed.data, followUpAt: followUpAt ?? "" })).eq("id", parsed.data.contactId).eq("opportunity_id", parsed.data.opportunityId).eq("project_id", active.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20contact%20could%20not%20be%20updated.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
  redirect(`/opportunities/${parsed.data.opportunityId}?contactSaved=true`);
}

export async function deleteContact(formData: FormData) {
  const parsed = z.object({ contactId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = await ownsOpportunity(parsed.data.opportunityId);
  const { error } = await active.supabase.from("contacts").delete().eq("id", parsed.data.contactId).eq("opportunity_id", parsed.data.opportunityId).eq("project_id", active.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20contact%20could%20not%20be%20deleted.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
}

export async function deleteTask(formData: FormData) {
  const parsed = z.object({ taskId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = await ownsOpportunity(parsed.data.opportunityId);
  const { error } = await active.supabase.from("tasks").delete().eq("id", parsed.data.taskId).eq("opportunity_id", parsed.data.opportunityId).eq("project_id", active.project.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20task%20could%20not%20be%20deleted.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath("/home");
}

export async function deleteNote(formData: FormData) {
  const parsed = z.object({ noteId: z.string().uuid(), opportunityId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = await ownsOpportunity(parsed.data.opportunityId);
  const { error } = await active.supabase.from("opportunity_notes").delete().eq("id", parsed.data.noteId).eq("opportunity_id", parsed.data.opportunityId).eq("user_id", active.user.id);
  if (error) redirect(`/opportunities/${parsed.data.opportunityId}?error=The%20note%20could%20not%20be%20deleted.`);
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
}
