import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("ai", async importOriginal => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, parsePartialJson: vi.fn(actual.parsePartialJson) };
});
import { parsePartialJson } from "ai";
import { createAgentReadContext } from "@/features/agent/read-context";
import type { SupabaseClient } from "@supabase/supabase-js";
import { streamAgentResponse } from "./stream-agent";

const reply = { message: "A **streamed** answer.", proposals: [], clarification: null };
function streamResponse(value: unknown, finishReason = "tool_calls", toolName = "roleway_agent") {
  const args = JSON.stringify(value);
  const chunks = [
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "call-1", type: "function", function: { name: toolName, arguments: "" } }] } }] },
    ...Array.from(args).map(character => ({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: character } }] } }] })),
    { choices: [{ index: 0, delta: {}, finish_reason: finishReason }], usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } },
  ];
  return new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("Agent provider streaming", () => {
  it.each(["openai", "openrouter"] as const)("streams partial answer text and validates the final %s tool input", async provider => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now += 60);
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(reply));
    vi.stubGlobal("fetch", fetchMock);
    const updates: string[] = [];
    const result = await streamAgentResponse({ provider, model: "fixture-model", base_url: null }, "fixture-key", "Fixture prompt", text => updates.push(text));
    expect(updates.length).toBeGreaterThan(2);
    expect(updates.at(-1)).toBe(reply.message);
    expect(result.output).toEqual({ message: reply.message, proposals: reply.proposals });
    expect(result.inputTokens).toBe(12);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.redirect).toBe("error");
    const body = JSON.parse(String(init.body));
    expect(body.stream).toBe(true);
    expect(body.tool_choice.function.name).toBe("roleway_agent");
    expect(updates.some(text => text.includes('"proposals"'))).toBe(false);
  });
  it("coalesces a burst of tiny deltas while delivering the exact final answer", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    const output = { ...reply, message: "Grounded answer. ".repeat(200).trim() };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(output)));
    const updates: string[] = [];
    const result = await streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", text => updates.push(text));
    expect(result.output.message).toBe(output.message);
    expect(updates.at(-1)).toBe(output.message);
    expect(vi.mocked(parsePartialJson).mock.calls.length).toBeLessThanOrEqual(2);
    expect(updates.length).toBeLessThanOrEqual(2);
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
    expect(result.output).toEqual({ message: reply.message, proposals: reply.proposals });
  });
  it("accepts Gemini streaming function calls", async () => {
    const data = { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "roleway_agent", args: reply } }] }, finishReason: "STOP", index: 0 }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify(data)}\n\n`, { headers: { "Content-Type": "text/event-stream" } })));
    const result = await streamAgentResponse({ provider: "gemini", model: "fixture", base_url: null }, "key", "prompt", () => {});
    expect(result.output).toEqual({ message: reply.message, proposals: reply.proposals });
  });
  it("rejects malformed proposals even after partial answer text is streamed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse({ message: "Draft", proposals: [{ tool: "create_task", targetId: null }] })));
    await expect(streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", () => {})).rejects.toThrow();
  });
  it.each(["", "I need to clarify the due date before proposing the task."])("turns clarification into a concrete question and withholds contradictory proposals (%s)", async message => {
    const proposal = { tool: "create_task", targetId: "7f3cd827-39d5-456a-b3c7-a724d68c1459", summary: "Prepare examples", title: "Prepare examples", body: null, name: null, objective: null, dueAt: null };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse({ message, clarification: "due_date", proposals: [proposal] })));
    const updates: string[] = [];
    const result = await streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "Due at 8 on Friday", text => updates.push(text));
    expect(result.output.proposals).toEqual([]);
    expect(result.output.message).toContain("What exact date and time do you mean?");
    expect(updates.at(-1)).toBe(result.output.message);
  });
  it("rejects a provider that omits the required clarification decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse({ message: "Ready", proposals: [] })));
    await expect(streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", () => {})).rejects.toThrow();
  });
  it("rejects an output-limit ending even when its JSON is valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(reply, "length")));
    await expect(streamAgentResponse({ provider: "openai", model: "fixture", base_url: null }, "key", "prompt", () => {})).rejects.toThrow(/output limit|required tool/);
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


it("continues after a scoped read and forces an answer within the step budget", async () => {
  const context = createAgentReadContext({supabase:{} as SupabaseClient,userId:"owner",workspaceIds:[],conversationId:"conversation"});
  context.tools.read_context.execute = vi.fn().mockResolvedValue({content:"Verified source: shipped TypeScript",truncated:false});
  const fetchMock = vi.fn().mockResolvedValueOnce(streamResponse({kind:"career_profile",id:null,offset:0}, "tool_calls", "read_context")).mockResolvedValueOnce(streamResponse(reply));
  vi.stubGlobal("fetch", fetchMock);
  const result = await streamAgentResponse({provider:"openai",model:"fixture",base_url:null},"key","Compare my evidence",()=>{},undefined,context.tools);
  expect(context.tools.read_context.execute).toHaveBeenCalledTimes(1);
  expect(result.output).toEqual({ message: reply.message, proposals: reply.proposals });
  expect(JSON.stringify(fetchMock.mock.calls[1]?.[1])).toContain("Verified source");
  expect(result.inputTokens).toBe(24);
});

it("does not log raw provider errors", async () => {
  const log = vi.spyOn(console,"error").mockImplementation(()=>{});
  try {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{message:"private prompt"}}),{status:500})));
    await expect(streamAgentResponse({provider:"openai",model:"fixture",base_url:null},"key","prompt",()=>{})).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});

it("forces the final answer after four read steps", async () => {
  const context = createAgentReadContext({supabase:{} as SupabaseClient,userId:"owner",workspaceIds:[],conversationId:"conversation"});
  context.tools.read_context.execute = vi.fn().mockResolvedValue({content:"A bounded source page",truncated:false});
  const fetchMock = vi.fn();
  for(let step=0;step<4;step++) fetchMock.mockResolvedValueOnce(streamResponse({kind:"conversation",id:null,offset:step*12},"tool_calls","read_context"));
  fetchMock.mockResolvedValueOnce(streamResponse(reply));
  vi.stubGlobal("fetch",fetchMock);
  const result=await streamAgentResponse({provider:"openai",model:"fixture",base_url:null},"key","Read earlier messages",()=>{},undefined,context.tools);
  expect(fetchMock).toHaveBeenCalledTimes(5);
  const finalRequest=JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body));
  expect(finalRequest.tools.map((entry: {function:{name:string}})=>entry.function.name)).toEqual(["roleway_agent"]);
  expect(finalRequest.tool_choice.function.name).toBe("roleway_agent");
  expect(result.output.message).toBe(reply.message);
});
