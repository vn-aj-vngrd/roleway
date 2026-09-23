"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["none", "owner", "admin", "support", "viewer"]),
});

function adminRedirect(view: string, type: "error" | "saved", message: string): never {
  redirect(`/admin?view=${view}&${type}=${encodeURIComponent(message)}`);
}

export async function setAdminRole(formData: FormData) {
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) adminRedirect("users", "error", "The requested role change was invalid.");
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { error } = await auth.supabase.rpc("admin_set_member_role", {
    input_user_id: parsed.data.userId,
    input_role: parsed.data.role,
  });
  if (error) adminRedirect("users", "error", error.message.includes("final owner") ? "The final owner cannot be removed." : "The admin role could not be changed.");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  adminRedirect("users", "saved", "Admin role updated and recorded.");
}

export async function setRegistrationPolicy(formData: FormData) {
  const parsed = z.object({
    registrationEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
    signupLimit: z.coerce.number().int().min(1).max(1_000_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) adminRedirect("settings", "error", "Enter a signup limit between 1 and 1,000,000.");
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { error } = await auth.supabase.rpc("admin_update_registration_policy", {
    input_registration_enabled: parsed.data.registrationEnabled,
    input_signup_limit: parsed.data.signupLimit,
  });
  if (error) adminRedirect("settings", "error", "Registration controls could not be updated.");
  revalidatePath("/admin");
  revalidatePath("/signup");
  adminRedirect("settings", "saved", "Registration controls updated and recorded.");
}

export async function setUserSuspension(formData: FormData) {
  const parsed = z.object({
    userId: z.string().uuid(),
    operation: z.enum(["suspend", "reactivate"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) adminRedirect("users", "error", "The requested account operation was invalid.");
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { data: manageable, error: authorizationError } = await auth.supabase.rpc("admin_target_is_manageable", { input_user_id: parsed.data.userId });
  if (authorizationError || manageable !== true) adminRedirect("users", "error", "That account cannot be managed by the current administrator.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: parsed.data.operation === "suspend" ? "876000h" : "none",
  });
  if (error) adminRedirect("users", "error", "The account status could not be changed.");

  const status = parsed.data.operation === "suspend" ? "suspended" : "active";
  const { error: auditError } = await auth.supabase.rpc("admin_record_user_status_change", {
    input_user_id: parsed.data.userId,
    input_status: status,
  });
  if (auditError) adminRedirect("users", "error", "The account changed, but its audit record could not be written. Review the system log.");
  revalidatePath("/admin");
  adminRedirect("users", "saved", `Account ${status}.`);
}
