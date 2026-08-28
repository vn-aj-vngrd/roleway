import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export default async function OpenSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) redirect("/home?error=That%20workspace%20is%20not%20available.");
  const { error } = await auth.supabase.rpc("set_active_search_project", { input_project_id: parsed.data });
  if (error) redirect("/home?error=That%20workspace%20is%20not%20available.");
  redirect("/home");
}
