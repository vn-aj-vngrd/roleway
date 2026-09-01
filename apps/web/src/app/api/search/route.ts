import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { recordSystemEvent } from "@/lib/observability";

const querySchema = z.string().trim().min(2).max(120);

export async function GET(request: NextRequest) {
  const context = await requireSearchContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!context.project) return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  const query = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  const { data: withinQuota, error: quotaError } = await context.supabase.rpc("consume_roleway_api_quota", { input_bucket: "search" });
  if (quotaError || withinQuota !== true) return NextResponse.json({ error: "Search is temporarily rate limited." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });

  const { data, error } = await context.supabase.rpc("search_roleway", {
    input_query: query.data,
    input_project_id: context.project.id,
  });
  if (error) {
    await recordSystemEvent({ category: "search", code: "workspace_search_failed", userId: context.user.id, metadata: { databaseCode: error.code ?? "unknown" } });
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ results: data ?? [], project: context.project.name }, { headers: { "Cache-Control": "no-store" } });
}
