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
    redirect("/settings/ai/usage?error=Choose%20a%20connection.");
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
    redirect("/settings/ai/usage?error=Connection%20unavailable.");
  const started = Date.now();
  let apiKey: string;
  try {
    apiKey = decryptSecret(connection.encrypted_secret, connection.secret_iv);
  } catch {
    redirect(
      "/settings/ai/usage?error=Connection%20could%20not%20be%20opened.",
    );
  }
  const { data: reservationId, error: reservationError } =
    await context.supabase.rpc("reserve_agent_evaluation", {
      input_connection_id: connection.id,
    });
  if (reservationError)
    redirect(
      "/settings/ai/usage?error=Model%20checks%20are%20unavailable.%20Try%20again.",
    );
  if (!reservationId)
    redirect(
      "/settings/ai/usage?error=Three%20checks%20per%2024%20hours%20are%20available.",
    );
  const evaluation = await evaluateConnection(
    {
      provider: connection.provider as AiProviderKind,
      model: connection.model,
      base_url: connection.base_url,
    },
    apiKey,
  );
  const passed = evaluation.checks.every((check) => check.status === "passed");
  const { error } = await admin
    .from("agent_eval_runs")
    .update({
      status: passed ? "passed" : "failed",
      checks: evaluation.checks,
      input_tokens: evaluation.inputTokens,
      output_tokens: evaluation.outputTokens,
      cost_usd_micros: evaluation.costUsdMicros,
      duration_ms: Date.now() - started,
    })
    .eq("id", reservationId)
    .eq("user_id", context.user.id);
  if (error)
    redirect(
      "/settings/ai/usage?error=Model%20checks%20could%20not%20be%20saved.",
    );
  revalidatePath("/settings/ai/usage");
  redirect(`/settings/ai/usage?check=${passed ? "passed" : "failed"}`);
}
