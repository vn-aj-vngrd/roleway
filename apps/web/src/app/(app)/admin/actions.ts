"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function setAdminRole(formData: FormData) {
  const parsed = z.object({ userId: z.string().uuid(), role: z.enum(["none", "owner", "admin", "support", "viewer"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { error } = await auth.supabase.rpc("admin_set_member_role", { input_user_id: parsed.data.userId, input_role: parsed.data.role });
  if (error) redirect(`/admin?view=users&error=${encodeURIComponent(error.message.includes("final owner") ? "The final owner cannot be removed." : "The admin role could not be changed.")}`);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin?view=users&saved=true");
}
