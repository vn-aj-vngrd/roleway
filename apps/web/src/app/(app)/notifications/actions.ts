"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { safeNextPath } from "@/lib/validation";

export async function markNotificationRead(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!id.success) return;
  const context = await requireSearchContext();
  if (!context) return;
  await context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id.data).eq("user_id", context.user.id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(formData: FormData) {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  const unreadView = formData.get("view") === "unread";
  const returnPath = unreadView
    ? "/notifications?view=unread"
    : "/notifications";
  const { error } = await context.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", context.user.id)
    .is("read_at", null);
  if (error) {
    const separator = unreadView ? "&" : "?";
    redirect(
      `${returnPath}${separator}error=Notifications%20could%20not%20be%20marked%20as%20read.%20Try%20again.`,
    );
  }
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  redirect(returnPath);
}

export async function openNotification(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!id.success) redirect("/notifications");
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  const { data: notification } = await context.supabase
    .from("notifications")
    .select("href, project_id")
    .eq("id", id.data)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!notification) redirect("/notifications");
  if (notification.project_id && notification.project_id !== context.project?.id) {
    const { error } = await context.supabase.rpc("set_active_search_project", { input_project_id: notification.project_id });
    if (error) redirect("/notifications?error=That%20Workspace%20is%20no%20longer%20available.");
  }
  await context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id.data).eq("user_id", context.user.id);
  revalidatePath("/", "layout");
  redirect(safeNextPath(notification.href, "/notifications"));
}
