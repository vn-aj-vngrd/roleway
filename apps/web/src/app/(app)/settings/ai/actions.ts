"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateAssistantOutput, type AiProviderKind } from "@/lib/ai/providers";
import { decryptSecret, encryptSecret } from "@/lib/ai/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const providerSchema = z.enum(["openai", "anthropic", "gemini", "openrouter", "openai-compatible"]);
const connectionIdSchema = z.string().uuid();
const defaultModels: Record<AiProviderKind, string> = { openai: "gpt-4.1-mini", anthropic: "claude-sonnet-4-5", gemini: "gemini-2.5-flash", openrouter: "openai/gpt-4.1-mini", "openai-compatible": "" };

export async function saveAiConnection(formData: FormData) {
  const parsed = z.object({ provider: providerSchema, label: z.string().trim().min(1).max(80), model: z.string().trim().max(160), baseUrl: z.string().trim().max(500), apiKey: z.string().trim().min(8).max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/settings/ai?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Check the connection details.")}`);
  const auth = await requireUser(); if (!auth) redirect("/login");
  const model = parsed.data.model || defaultModels[parsed.data.provider];
  if (!model) redirect("/settings/ai?error=Enter%20a%20model%20name.");
  if (parsed.data.provider === "openai-compatible" && !parsed.data.baseUrl) redirect("/settings/ai?error=Enter%20the%20provider%20base%20URL.");
  const secret = encryptSecret(parsed.data.apiKey);
  const admin = createAdminClient();
  const { error } = await admin.from("ai_connections").insert({ user_id: auth.user.id, provider: parsed.data.provider, label: parsed.data.label, model, base_url: parsed.data.baseUrl || null, encrypted_secret: secret.encrypted, secret_iv: secret.iv, key_hint: `••••${parsed.data.apiKey.slice(-4)}` });
  if (error) redirect("/settings/ai?error=The%20connection%20could%20not%20be%20saved.");
  revalidatePath("/settings/ai"); revalidatePath("/assistant");
  redirect("/settings/ai?saved=true");
}

export async function testAiConnection(formData: FormData) {
  const connectionId = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!connectionId.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  const admin = createAdminClient();
  const { data } = await admin.from("ai_connections").select("id, provider, model, base_url, encrypted_secret, secret_iv").eq("id", connectionId.data).eq("user_id", auth.user.id).maybeSingle();
  if (!data) redirect("/settings/ai?error=Connection%20not%20found.");
  try {
    const apiKey = decryptSecret(data.encrypted_secret, data.secret_iv);
    await generateAssistantOutput({ provider: data.provider as AiProviderKind, model: data.model, base_url: data.base_url }, apiKey, "Connection check. Return title 'Connection ready', summary 'Roleway can use this model.', one suggestion titled 'Continue', and no cautions.");
    await admin.from("ai_connections").update({ status: "connected", last_error: null, last_tested_at: new Date().toISOString() }).eq("id", data.id);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 220) : "Provider connection failed.";
    await admin.from("ai_connections").update({ status: "error", last_error: message, last_tested_at: new Date().toISOString() }).eq("id", data.id);
    revalidatePath("/settings/ai");
    redirect(`/settings/ai?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/settings/ai");
  redirect("/settings/ai?tested=true");
}

export async function deleteAiConnection(formData: FormData) {
  const connectionId = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!connectionId.success) return;
  const auth = await requireUser(); if (!auth) redirect("/login");
  await createAdminClient().from("ai_connections").delete().eq("id", connectionId.data).eq("user_id", auth.user.id);
  revalidatePath("/settings/ai"); revalidatePath("/assistant");
  redirect("/settings/ai?deleted=true");
}
