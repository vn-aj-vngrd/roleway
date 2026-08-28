"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { formDateTimeToIso } from "@/lib/datetime";

const optionalUrl = z.union([z.literal(""), z.string().url("Enter a valid profile URL.")]);
const optionalEmail = z.union([z.literal(""), z.string().email("Enter a valid email address.")]);
const optionalUuid = z.union([z.literal(""), z.string().uuid()]);

const contactSchema = z.object({
  contactId: z.string().uuid().optional(),
  opportunityId: optionalUuid,
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

async function activeContext() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  return { ...context, project: context.project };
}

async function verifyOpportunity(opportunityId: string, projectId: string, supabase: Awaited<ReturnType<typeof activeContext>>["supabase"]) {
  if (!opportunityId) return null;
  const { data } = await supabase.from("opportunities").select("id").eq("id", opportunityId).eq("project_id", projectId).maybeSingle();
  if (!data) redirect("/contacts?error=That%20Opportunity%20is%20not%20part%20of%20this%20workspace.");
  return data.id;
}

function payload(data: z.infer<typeof contactSchema>, followUpAt: string | null) {
  return {
    name: data.name,
    role: data.role,
    company: data.company,
    relationship: data.relationship,
    email: data.email || null,
    phone: data.phone || null,
    profile_url: data.profileUrl || null,
    notes: data.notes,
    follow_up_at: followUpAt,
  };
}

function revalidateContactSurfaces(opportunityId?: string | null) {
  revalidatePath("/contacts");
  revalidatePath("/home");
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createProjectContact(formData: FormData) {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/contacts?create=true&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the contact details.")}`);
  const context = await activeContext();
  const opportunityId = await verifyOpportunity(parsed.data.opportunityId, context.project.id, context.supabase);
  let followUpAt: string | null;
  try { followUpAt = formDateTimeToIso(formData, "followUpAt"); }
  catch (error) { redirect(`/contacts?create=true&error=${encodeURIComponent(error instanceof Error ? error.message : "Check the follow-up time.")}`); }

  const { data, error } = await context.supabase.from("contacts").insert({
    user_id: context.user.id,
    project_id: context.project.id,
    opportunity_id: opportunityId,
    ...payload(parsed.data, followUpAt),
  }).select("id").single();
  if (error || !data) redirect("/contacts?create=true&error=The%20contact%20could%20not%20be%20saved.");

  if (opportunityId) {
    await context.supabase.from("opportunity_events").insert({
      user_id: context.user.id,
      opportunity_id: opportunityId,
      actor: "user",
      event_type: "contact_added",
      payload: { contact_id: data.id, name: parsed.data.name, relationship: parsed.data.relationship },
    });
  }
  revalidateContactSurfaces(opportunityId);
  redirect("/contacts?created=true");
}

export async function updateProjectContact(formData: FormData) {
  const parsed = contactSchema.required({ contactId: true }).safeParse(Object.fromEntries(formData));
  const contactId = String(formData.get("contactId") ?? "");
  if (!parsed.success) redirect(`/contacts?edit=${encodeURIComponent(contactId)}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the contact details.")}`);
  const context = await activeContext();
  const opportunityId = await verifyOpportunity(parsed.data.opportunityId, context.project.id, context.supabase);
  let followUpAt: string | null;
  try { followUpAt = formDateTimeToIso(formData, "followUpAt"); }
  catch (error) { redirect(`/contacts?edit=${parsed.data.contactId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Check the follow-up time.")}`); }

  const { data: existing } = await context.supabase.from("contacts").select("opportunity_id").eq("id", parsed.data.contactId).eq("project_id", context.project.id).maybeSingle();
  if (!existing) redirect("/contacts?error=That%20contact%20is%20not%20part%20of%20this%20workspace.");
  const { error } = await context.supabase.from("contacts").update({ opportunity_id: opportunityId, ...payload(parsed.data, followUpAt) }).eq("id", parsed.data.contactId).eq("project_id", context.project.id);
  if (error) redirect(`/contacts?edit=${parsed.data.contactId}&error=The%20contact%20could%20not%20be%20updated.`);

  revalidateContactSurfaces(existing.opportunity_id);
  revalidateContactSurfaces(opportunityId);
  redirect("/contacts?saved=true");
}

export async function deleteProjectContact(formData: FormData) {
  const parsed = z.object({ contactId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const context = await activeContext();
  const { data: existing } = await context.supabase.from("contacts").select("opportunity_id").eq("id", parsed.data.contactId).eq("project_id", context.project.id).maybeSingle();
  if (!existing) return;
  const { error } = await context.supabase.from("contacts").delete().eq("id", parsed.data.contactId).eq("project_id", context.project.id);
  if (error) redirect("/contacts?error=The%20contact%20could%20not%20be%20removed.");
  revalidateContactSurfaces(existing.opportunity_id);
  redirect("/contacts?deleted=true");
}
