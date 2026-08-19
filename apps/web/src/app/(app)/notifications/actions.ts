"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function markNotificationRead(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!id.success) return;
  const auth = await requireUser();
  if (!auth) return;
  await auth.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id.data).eq("user_id", auth.user.id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const auth = await requireUser();
  if (!auth) return;
  await auth.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", auth.user.id).is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
