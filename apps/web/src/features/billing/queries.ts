import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "./types";
export async function getPlans(includePrivate = false): Promise<Plan[]> {
  const supabase = await createClient();
  let query = supabase.from("plan_catalog").select("*");
  if (!includePrivate) query = query.neq("slug", "unlimited");
  const { data, error } = await query;
  if (error) return [];
  return (data as Plan[]).sort(
    (a, b) =>
      ["free", "plus", "pro", "unlimited"].indexOf(a.slug) -
      ["free", "plus", "pro", "unlimited"].indexOf(b.slug),
  );
}
