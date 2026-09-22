import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { runAgentRequest } from "@/features/agent/run-request";
import type { AgentUIMessage } from "@/features/agent/stream-types";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("Invalid request origin", { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 40_000) return new Response("Request too large", { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return new Response("Invalid request", { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return new Response("Invalid request", { status: 400 });
  const form = new FormData();
  for (const key of ["conversationId", "connectionId", "opportunityId", "workspaceId", "contextPage", "timeZone", "message"]) {
    if (typeof body[key] === "string") form.set(key, body[key]);
  }
  const stream = createUIMessageStream<AgentUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: crypto.randomUUID() });
      const href = await runAgentRequest(form, (event) => {
        if (event.type === "progress") writer.write({ type: "data-progress", id: event.data.id, data: event.data });
        if (event.type === "answer") writer.write({ type: "data-answer", id: "answer", data: { text: event.text } });
        if (event.type === "started") writer.write({ type: "data-started", data: { conversationId: event.conversationId, runId: event.runId }, transient: true });
      }, request.signal);
      writer.write({ type: "data-result", data: { href }, transient: true });
      writer.write({ type: "finish" });
    },
    onError: () => "The connection was interrupted. Reload this conversation to check whether the answer was saved.",
  });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
