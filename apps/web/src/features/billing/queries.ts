import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "./types";
export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plan_catalog").select("*");
  if (error) return [];
  return (data as Plan[]).sort(
    (a, b) =>
      ["free", "plus", "pro"].indexOf(a.slug) -
      ["free", "plus", "pro"].indexOf(b.slug),
  );
}
