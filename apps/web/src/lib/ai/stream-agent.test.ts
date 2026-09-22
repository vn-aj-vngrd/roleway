import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { streamAgentResponse } from "./stream-agent";

const reply = { message: "A **streamed** answer.", proposals: [] };
function streamResponse(value: unknown) {
  const args = JSON.stringify(value);
  const chunks = [
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "call-1", type: "function", function: { name: "roleway_agent", arguments: "" } }] } }] },
    ...Array.from(args).map(character => ({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: character } }] } }] })),
    { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } },
  ];
  return new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
}
afterEach(() => vi.unstubAllGlobals());

describe("Agent provider streaming", () => {
  it.each(["openai", "openrouter"] as const)("streams partial answer text and validates the final %s tool input", async provider => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(reply));
    vi.stubGlobal("fetch", fetchMock);
    const updates: string[] = [];
    const result = await streamAgentResponse({ provider, model: "fixture-model", base_url: null }, "fixture-key", "Fixture prompt", text => updates.push(text));
    expect(updates.length).toBeGreaterThan(2);
    expect(updates.at(-1)).toBe(reply.message);
    expect(result.output).toEqual(reply);
    expect(result.inputTokens).toBe(12);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.redirect).toBe("error");
    const body = JSON.parse(String(init.body));
    expect(body.stream).toBe(true);
    expect(body.tool_choice.function.name).toBe("roleway_agent");
    expect(updates.some(text => text.includes('"proposals"'))).toBe(false);
  });
  it("accepts Anthropic streaming tool input", async () => {
    const events = [
      ["message_start", { type: "message_start", message: { id: "msg-1", type: "message", role: "assistant", model: "fixture", content: [], usage: { input_tokens: 10, output_tokens: 0 } } }],
      ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "call-1", name: "roleway_agent", input: {} } }],
      ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(reply) } }],
      ["content_block_stop", { type: "content_block_stop", index: 0 }],
      ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 20 } }],
      ["message_stop", { type: "message_stop" }],
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } })));
    const result = await streamAgentResponse({ provider: "anthropic", model: "fixture", base_url: null }, "key", "prompt", () => {});
    expect(result.output).toEqual(reply);
  });
  it("accepts Gemini streaming function calls", async () => {
    const data = { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "roleway_agent", args: reply } }] }, finishReason: "STOP", index: 0 }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify(data)}\n\n`, { headers: { "Content-Type": "text/event-stream" } })));
    const result = await streamAgentResponse({ provider: "gemini", model: "fixture", base_url: null }, "key", "prompt", () => {});
    expect(result.output).toEqual(reply);
  });
  it("rejects malformed proposals even after partial answer text is streamed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse({ message: "Draft", proposals: [{ tool: "create_task", targetId: null }] })));
    await expect(streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", () => {})).rejects.toThrow();
  });
  it("never sends credentials to an unsafe compatible endpoint", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(streamAgentResponse({ provider: "openai-compatible", model: "fixture", base_url: "https://127.0.0.1/v1" }, "key", "prompt", () => {})).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("handles provider errors without treating the response as complete", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
    await expect(streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", () => {})).rejects.toThrow();
  });
});
