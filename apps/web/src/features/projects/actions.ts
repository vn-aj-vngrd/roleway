"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordSystemEvent } from "@/lib/observability";
import { commaSeparatedList } from "@/lib/validation";
import { requireUser } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const projectSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Name this workspace.").max(100),
  ticketKey: z.string().trim().min(2, "Add a 2–10 character Opportunity key.").max(10).regex(/^[A-Za-z][A-Za-z0-9]*$/, "Use letters and numbers, beginning with a letter.").transform((value) => value.toUpperCase()),
  iconType: z.enum(["icon", "emoji"]),
  iconValue: z.string().trim().min(1).max(32),
  iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(2000),
  objective: z.string().trim().max(500),
  targetTitles: z.string(),
  industries: z.string(),
  technologies: z.string(),
  employmentTypes: z.string(),
  locations: z.string(),
  remotePreference: z.enum(["required", "preferred", "flexible"]),
  minimumCompensation: z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)]),
  currency: z.string().trim().length(3),
  seniority: z.string(),
  companySizes: z.string(),
  dealBreakers: z.string(),
  preferredCompanies: z.string(),
  excludedCompanies: z.string(),
  searchKeywords: z.string(),
  weeklyApplicationGoal: z.coerce.number().int().min(0).max(100),
});

async function authenticated() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  return auth;
}

function projectPayload(data: z.infer<typeof projectSchema>) {
  return {
    name: data.name,
    ticket_key: data.ticketKey,
    icon_type: data.iconType,
    icon_value: data.iconValue,
    icon_color: data.iconColor,
    description: data.description,
    objective: data.objective,
    target_titles: commaSeparatedList(data.targetTitles),
    industries: commaSeparatedList(data.industries),
    preferred_technologies: commaSeparatedList(data.technologies),
    employment_types: commaSeparatedList(data.employmentTypes),
    locations: commaSeparatedList(data.locations),
    remote_preference: data.remotePreference,
    minimum_compensation: data.minimumCompensation === "" ? null : data.minimumCompensation,
    currency: data.currency.toUpperCase(),
    seniority: commaSeparatedList(data.seniority),
    company_sizes: commaSeparatedList(data.companySizes),
    deal_breakers: commaSeparatedList(data.dealBreakers),
    preferred_companies: commaSeparatedList(data.preferredCompanies),
    excluded_companies: commaSeparatedList(data.excludedCompanies),
    search_keywords: commaSeparatedList(data.searchKeywords),
    weekly_application_goal: data.weeklyApplicationGoal,
  };
}

export async function switchSearchProject(formData: FormData) {
  const projectId = uuid.safeParse(formData.get("projectId"));
  const returnToValue = formData.get("returnTo");
  const returnTo = typeof returnToValue === "string" && ["/home", "/inbox", "/opportunities", "/interview", "/contacts", "/documents"].includes(returnToValue) ? returnToValue : "/home";
  if (!projectId.success) redirect("/home?error=That%20workspace%20is%20not%20available.");
  const auth = await authenticated();
  const { error } = await auth.supabase.rpc("set_active_search_project", { input_project_id: projectId.data });
  if (error) {
    await recordSystemEvent({ category: "search_project", code: "project_switch_failed", userId: auth.user.id, metadata: { databaseCode: error.code ?? "unknown" } });
    redirect("/home?error=That%20workspace%20could%20not%20be%20opened.");
  }
  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function toggleSearchProjectFavorite(formData: FormData) {
  const parsed = z.object({ projectId: uuid, favorite: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase
    .from("search_projects")
    .update({ is_favorite: parsed.data.favorite === "true" })
    .eq("id", parsed.data.projectId)
    .eq("user_id", auth.user.id)
    .neq("status", "archived");
  if (error) await recordSystemEvent({ category: "search_project", code: "project_favorite_failed", userId: auth.user.id, metadata: { databaseCode: error.code ?? "unknown" } });
  revalidatePath("/", "layout");
}

export async function openSearchProjectSettings(formData: FormData) {
  const parsed = z.object({ projectId: uuid, focus: z.enum(["name"]).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings/workspaces?error=That%20workspace%20is%20not%20available.");
  const auth = await authenticated();
  const { error } = await auth.supabase.rpc("set_active_search_project", { input_project_id: parsed.data.projectId });
  if (error) redirect("/settings/workspaces?error=That%20workspace%20could%20not%20be%20opened.");
  revalidatePath("/", "layout");
  redirect(parsed.data.focus === "name" ? `/settings/workspaces/${parsed.data.projectId}/general?focus=name` : `/settings/workspaces/${parsed.data.projectId}`);
}

export async function createSearchProject(formData: FormData) {
  const returnToValue = formData.get("returnTo");
  const returnTo = typeof returnToValue === "string" && returnToValue.startsWith("/") && !returnToValue.startsWith("//") ? returnToValue : "/home";
  const createErrorHref = (message: string) => `${returnTo}${returnTo.includes("?") ? "&" : "?"}workspaceCreate=true&workspaceError=${encodeURIComponent(message)}`;
  const successHref = `${returnTo}${returnTo.includes("?") ? "&" : "?"}workspaceCreated=true`;
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(createErrorHref(parsed.error.issues[0]?.message ?? "Check the workspace details."));
  const auth = await authenticated();
  const { data, error } = await auth.supabase
    .from("search_projects")
    .insert({ user_id: auth.user.id, ...projectPayload(parsed.data) })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code !== "23505") await recordSystemEvent({ category: "search_project", code: "project_create_failed", userId: auth.user.id, metadata: { databaseCode: error?.code ?? "missing_result" } });
    const message = error?.code === "23505" ? "That Workspace name or Opportunity key is already in use." : "The workspace could not be created.";
    redirect(createErrorHref(message));
  }
  const { error: switchError } = await auth.supabase.rpc("set_active_search_project", { input_project_id: data.id });
  if (switchError) redirect(createErrorHref("The new Workspace was created but could not be opened."));
  revalidatePath("/", "layout");
  redirect(successHref);
}

export async function updateWorkspaceHomeDetails(formData: FormData) {
  const parsed = z.object({
    projectId: uuid,
    name: z.string().trim().min(2, "Name this Workspace.").max(100),
    ticketKey: z.string().trim().min(2).max(10).regex(/^[A-Za-z][A-Za-z0-9]*$/).transform((value) => value.toUpperCase()),
    iconType: z.enum(["icon", "emoji"]),
    iconValue: z.string().trim().min(1).max(32),
    iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).transform((value) => value.toUpperCase()),
    objective: z.string().trim().max(500),
    description: z.string().trim().max(2000),
    targetTitles: z.string(),
    industries: z.string(),
    seniority: z.string(),
    locations: z.string(),
    remotePreference: z.enum(["required", "preferred", "flexible"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/home?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the Workspace details.")}`);
  const auth = await authenticated();
  const { error } = await auth.supabase.from("search_projects").update({
    name: parsed.data.name,
    ticket_key: parsed.data.ticketKey,
    icon_type: parsed.data.iconType,
    icon_value: parsed.data.iconValue,
    icon_color: parsed.data.iconColor,
    objective: parsed.data.objective,
    description: parsed.data.description,
    target_titles: commaSeparatedList(parsed.data.targetTitles),
    industries: commaSeparatedList(parsed.data.industries),
    seniority: commaSeparatedList(parsed.data.seniority),
    locations: commaSeparatedList(parsed.data.locations),
    remote_preference: parsed.data.remotePreference,
  }).eq("id", parsed.data.projectId).eq("user_id", auth.user.id).neq("status", "archived");
  if (error) {
    const message = error.code === "23505" ? "That Workspace name or Opportunity key is already in use." : "The Workspace details could not be saved.";
    redirect(`/home?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/", "layout");
  revalidatePath("/home");
  redirect("/home?workspaceSaved=true");
}

export async function updateSearchProject(formData: FormData) {
  const returnProjectId = String(formData.get("projectId") ?? "");
  const parsed = projectSchema.required({ projectId: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/settings/workspaces/${returnProjectId}/general?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the Workspace details.")}`);
  const auth = await authenticated();
  const { error } = await auth.supabase
    .from("search_projects")
    .update(projectPayload(parsed.data))
    .eq("id", parsed.data.projectId)
    .eq("user_id", auth.user.id);
  if (error) {
    const message = error.code === "23505" ? "That Workspace name or Opportunity key is already in use." : "The Workspace could not be saved.";
    redirect(`/settings/workspaces/${parsed.data.projectId}/general?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/", "layout");
  redirect(`/settings/workspaces/${parsed.data.projectId}/general?saved=true`);
}

export async function restoreSearchProject(formData: FormData) {
  const projectId = uuid.safeParse(formData.get("projectId"));
  if (!projectId.success) return;
  const auth = await authenticated();
  const { error } = await auth.supabase.from("search_projects").update({ status: "active" }).eq("id", projectId.data).eq("user_id", auth.user.id).eq("status", "archived");
  if (error) {
    const message = error.code === "23505" ? "Rename the current Workspace that already uses this name before restoring." : "The Workspace could not be restored.";
    redirect(`/settings/workspaces?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/settings/workspaces?restored=true");
}

export async function archiveSearchProject(formData: FormData) {
  const projectId = uuid.safeParse(formData.get("projectId"));
  if (!projectId.success) return;
  const auth = await authenticated();
  const [{ data: projects, error: projectError }, { data: profile }] = await Promise.all([
    auth.supabase.from("search_projects").select("id").neq("status", "archived").order("updated_at", { ascending: false }),
    auth.supabase.from("profiles").select("active_project_id").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (projectError || !projects || projects.length < 2) redirect("/settings/workspaces?error=Keep%20at%20least%20one%20Workspace.");
  const replacement = projects.find((item) => item.id !== projectId.data);
  if (!replacement) redirect("/settings/workspaces?error=Keep%20at%20least%20one%20Workspace.");
  const { error } = await auth.supabase.from("search_projects").update({ status: "archived", is_favorite: false }).eq("id", projectId.data).eq("user_id", auth.user.id);
  if (error) redirect("/settings/workspaces?error=The%20Workspace%20could%20not%20be%20archived.");
  if (profile?.active_project_id === projectId.data) {
    const { error: switchError } = await auth.supabase.rpc("set_active_search_project", { input_project_id: replacement.id });
    if (switchError) {
      await auth.supabase.from("search_projects").update({ status: "active" }).eq("id", projectId.data).eq("user_id", auth.user.id);
      await recordSystemEvent({ category: "search_project", code: "project_archive_switch_failed", userId: auth.user.id, metadata: { databaseCode: switchError.code ?? "unknown" } });
      redirect("/settings/workspaces?error=The%20Workspace%20could%20not%20be%20archived.");
    }
  }
  revalidatePath("/", "layout");
  redirect("/settings/workspaces?archived=true");
}
