"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

export async function completeTour() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  await auth.supabase.from("profiles").update({ tour_completed: true }).eq("user_id", auth.user.id);
  revalidatePath("/", "layout");
}

export async function restartTour() {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  await auth.supabase.from("profiles").update({ tour_completed: false }).eq("user_id", auth.user.id);
  revalidatePath("/", "layout");
  redirect("/today?tour=true");
}
