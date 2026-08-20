import { z } from "zod";

export const assistantOutputSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1600),
  suggestions: z.array(z.object({ title: z.string().min(1).max(180), rationale: z.string().min(1).max(600) })).min(1).max(6),
  cautions: z.array(z.string().min(1).max(400)).max(6),
});
export type AssistantOutput = z.infer<typeof assistantOutputSchema>;
export type AiProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "openai-compatible";
export type AiConnection = { provider: AiProviderKind; model: string; base_url: string | null };

const outputJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    suggestions: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, rationale: { type: "string" } }, required: ["title", "rationale"], additionalProperties: false } },
    cautions: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: ["title", "summary", "suggestions", "cautions"],
  additionalProperties: false,
} as const;

function safeCompatibleBaseUrl(value: string | null) {
  if (!value) throw new Error("A base URL is required for this provider.");
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const blocked = host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (url.protocol !== "https:" || blocked) throw new Error("Use a public HTTPS provider URL.");
  return url.toString().replace(/\/$/, "");
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(45_000) });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const nested = payload?.error as { message?: string } | string | undefined;
    const message = typeof nested === "string" ? nested : nested?.message;
    throw new Error(message || `Provider request failed (${response.status}).`);
  }
  return payload;
}

function parseOutput(value: unknown) {
  if (typeof value === "string") {
    const clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return assistantOutputSchema.parse(JSON.parse(clean));
  }
  return assistantOutputSchema.parse(value);
}

async function openAiCompatible(connection: AiConnection, apiKey: string, prompt: string) {
  const base = connection.provider === "openai" ? "https://api.openai.com/v1" : connection.provider === "openrouter" ? "https://openrouter.ai/api/v1" : safeCompatibleBaseUrl(connection.base_url);
  const payload = await requestJson(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...(connection.provider === "openrouter" ? { "HTTP-Referer": "https://roleway.vercel.app", "X-Title": "Roleway" } : {}) },
    body: JSON.stringify({ model: connection.model, messages: [{ role: "system", content: "You are Roleway Assist. Use only the supplied career and Opportunity context. Never invent experience, dates, employers, or outcomes. Return a concise reviewable draft, not an external action." }, { role: "user", content: prompt }], temperature: 0.2, response_format: { type: "json_schema", json_schema: { name: "roleway_assist", strict: true, schema: outputJsonSchema } } }),
  });
  const choices = payload?.choices as Array<{ message?: { content?: string } }> | undefined;
  const usage = payload?.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return { output: parseOutput(choices?.[0]?.message?.content), inputTokens: usage?.prompt_tokens, outputTokens: usage?.completion_tokens };
}

async function anthropic(connection: AiConnection, apiKey: string, prompt: string) {
  const payload = await requestJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: connection.model, max_tokens: 1800, system: "You are Roleway Assist. Use only supplied facts. Never take external actions. Produce a reviewable draft.", messages: [{ role: "user", content: prompt }], tools: [{ name: "return_roleway_assist", description: "Return the structured Roleway assistance draft", input_schema: outputJsonSchema }], tool_choice: { type: "tool", name: "return_roleway_assist" } }),
  });
  const content = payload?.content as Array<{ type?: string; input?: unknown }> | undefined;
  const usage = payload?.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  return { output: parseOutput(content?.find((part) => part.type === "tool_use")?.input), inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens };
}

async function gemini(connection: AiConnection, apiKey: string, prompt: string) {
  const payload = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(connection.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Roleway Assist. Use only supplied facts, never invent career evidence, and never take external actions." }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseJsonSchema: outputJsonSchema } }),
  });
  const candidates = payload?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const usage = payload?.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
  return { output: parseOutput(candidates?.[0]?.content?.parts?.[0]?.text), inputTokens: usage?.promptTokenCount, outputTokens: usage?.candidatesTokenCount };
}

export async function generateAssistantOutput(connection: AiConnection, apiKey: string, prompt: string) {
  if (connection.provider === "anthropic") return anthropic(connection, apiKey, prompt);
  if (connection.provider === "gemini") return gemini(connection, apiKey, prompt);
  return openAiCompatible(connection, apiKey, prompt);
}
