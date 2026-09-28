"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/ai/secrets";
import type { AiProviderKind } from "@/lib/ai/providers";
import { evaluateConnection } from "@/features/agent/evaluate-connection";

export async function runAgentEvaluation(formData: FormData) {
  const parsed = z.string().uuid().safeParse(formData.get("connectionId"));
  if (!parsed.success)
    redirect("/agent/insights?error=Choose%20a%20connection.");
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("ai_connections")
    .select(
      "id, provider, model, base_url, encrypted_secret, secret_iv, status",
    )
    .eq("id", parsed.data)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!connection || connection.status !== "connected")
    redirect("/agent/insights?error=Connection%20unavailable.");
  const { count, error: quotaError } = await admin
    .from("agent_eval_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.user.id)
    .gte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );
  if (quotaError)
    redirect(
      "/agent/insights?error=Model%20checks%20are%20unavailable.%20Try%20again.",
    );
  if ((count ?? 0) >= 3)
    redirect(
      "/agent/insights?error=Three%20checks%20per%20day%20are%20available.",
    );
  const started = Date.now();
  let apiKey: string;
  try {
    apiKey = decryptSecret(connection.encrypted_secret, connection.secret_iv);
  } catch {
    redirect("/agent/insights?error=Connection%20could%20not%20be%20opened.");
  }
  const evaluation = await evaluateConnection(
    {
      provider: connection.provider as AiProviderKind,
      model: connection.model,
      base_url: connection.base_url,
    },
    apiKey,
  );
  const passed = evaluation.checks.every((check) => check.status === "passed");
  const { error } = await admin.from("agent_eval_runs").insert({
    user_id: context.user.id,
    connection_id: connection.id,
    provider: connection.provider,
    model: connection.model,
    status: passed ? "passed" : "failed",
    checks: evaluation.checks,
    input_tokens: evaluation.inputTokens,
    output_tokens: evaluation.outputTokens,
    cost_usd_micros: evaluation.costUsdMicros,
    duration_ms: Date.now() - started,
  });
  if (error)
    redirect(
      "/agent/insights?error=Model%20checks%20could%20not%20be%20saved.",
    );
  revalidatePath("/agent/insights");
  redirect(`/agent/insights?check=${passed ? "passed" : "failed"}`);
}
