import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { parsePartialJson, streamText, tool } from "ai";
import { agentResponseSchema } from "@roleway/schemas";
import { agentSystemPolicy, safeCompatibleBaseUrl, type AiConnection } from "./providers";

export async function streamAgentResponse(connection: AiConnection, apiKey: string, prompt: string, onText: (text: string) => void, signal?: AbortSignal) {
  // Keep provider requests on the validated endpoint and never follow redirects with credentials.
  const safeFetch: typeof fetch = (input, init) => {
    const body = connection.provider === "openrouter" && typeof init?.body === "string"
      ? JSON.stringify({ ...JSON.parse(init.body), reasoning: { enabled: false } }) : init?.body;
    return fetch(input, { ...init, ...(body !== undefined ? { body } : {}), redirect: "error", cache: "no-store" });
  };
  const baseURL = connection.provider === "openai-compatible" ? await safeCompatibleBaseUrl(connection.base_url)
    : connection.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined;
  const model = connection.provider === "anthropic"
    ? createAnthropic({ apiKey, fetch: safeFetch })(connection.model)
    : connection.provider === "gemini"
      ? createGoogleGenerativeAI({ apiKey, fetch: safeFetch })(connection.model)
      : createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), fetch: safeFetch, ...(connection.provider === "openrouter" ? { headers: { "HTTP-Referer": "https://roleway.vanajvanguardia.tech", "X-Title": "Roleway" } } : {}) }).chat(connection.model);
  const deadline = AbortSignal.timeout(connection.provider === "openrouter" ? 240_000 : 45_000);
  const abortSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const result = streamText({
    model,
    instructions: agentSystemPolicy,
    prompt,
    maxOutputTokens: 3000,
    maxRetries: 0,
    // Provider errors can contain prompts; the caller records only redacted error codes.
    onError: () => {},
    abortSignal,
    tools: {
      roleway_agent: tool({
        description: "Return the complete grounded answer in message and any reviewable proposals. This ends the turn; no continuation follows. This does not execute any changes.",
        inputSchema: agentResponseSchema,
      }),
    },
    toolChoice: { type: "tool", toolName: "roleway_agent" },
  });
  let input = "";
  let inputId: string | undefined;
  let lastText = "";
  let output: unknown;
  for await (const part of result.stream) {
    if (part.type === "error") throw part.error;
    if (part.type === "abort") throw abortSignal.reason ?? new Error("Provider stream interrupted");
    if (part.type === "tool-input-start" && part.toolName === "roleway_agent") {
      if (inputId) throw new Error("Multiple response calls are not supported");
      inputId = part.id;
    }
    if (part.type === "tool-input-delta" && part.id === inputId) {
      input += part.delta;
      if (input.length > 120_000) throw new Error("Provider response too large");
      const { value } = await parsePartialJson(input);
      if (value && typeof value === "object" && "message" in value && typeof value.message === "string" && value.message !== lastText) {
        lastText = value.message.slice(0, 30_000);
        onText(lastText);
      }
    }
    if (part.type === "tool-call" && part.toolName === "roleway_agent") output = part.input;
    if (part.type === "tool-error") throw new Error("Invalid provider tool output");
  }
  if (await result.finishReason === "length") throw new Error("Provider response reached its output limit");
  const parsed = agentResponseSchema.parse(output);
  if (parsed.message !== lastText) onText(parsed.message);
  const usage = await result.totalUsage;
  return { output: parsed, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}
