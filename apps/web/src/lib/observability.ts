import { createAdminClient } from "@/lib/supabase/admin";

type SystemEvent = {
  level?: "warning" | "error";
  category: string;
  code: string;
  userId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Records a redacted operational signal without interrupting the user-facing recovery path. */
export async function recordSystemEvent({ level = "error", category, code, userId = null, metadata = {} }: SystemEvent) {
  const safeMetadata = Object.fromEntries(Object.entries(metadata).slice(0, 12).map(([key, value]) => [key.slice(0, 80), typeof value === "string" ? value.slice(0, 240) : value]));
  console.error(JSON.stringify({ level, category, code, userId, metadata: safeMetadata }));
  try {
    await createAdminClient().from("system_events").insert({ level, category, code, user_id: userId, metadata: safeMetadata });
  } catch {
    // Logging must never replace the original user-facing recovery path.
  }
}
