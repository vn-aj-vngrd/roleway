import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const tables = ["profiles", "career_preferences", "jobs", "opportunities", "tasks", "opportunity_notes", "opportunity_events", "interviews", "documents", "notifications"] as const;
  const results = await Promise.all(tables.map(async (table) => {
    const { data, error } = await auth.supabase.from(table).select("*");
    return [table, { data: data ?? [], error: error?.message }] as const;
  }));
  const failed = results.find(([, result]) => result.error);
  if (failed) return NextResponse.json({ error: "The export could not be completed. Try again." }, { status: 500 });

  const payload = {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    user: { id: auth.user.id, email: auth.user.email },
    data: Object.fromEntries(results.map(([table, result]) => [table, result.data])),
  };
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="roleway-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
