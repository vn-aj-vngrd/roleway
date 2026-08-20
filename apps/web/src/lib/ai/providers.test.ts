import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAssistantOutput } from "./providers";

const draft = { title: "Plan", summary: "A grounded plan.", suggestions: [{ title: "Prepare examples", rationale: "The role requires systems work." }], cautions: [] };

afterEach(() => vi.unstubAllGlobals());

describe("AI provider adapters", () => {
  it("parses OpenAI-compatible structured output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft) } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateAssistantOutput({ provider: "openai", model: "gpt-4.1-mini", base_url: null }, "secret", "Prompt");
    expect(result.output).toEqual(draft);
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
  });

  it("parses Anthropic forced-tool output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "tool_use", input: draft }], usage: { input_tokens: 4, output_tokens: 8 } }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await generateAssistantOutput({ provider: "anthropic", model: "claude-sonnet-4-5", base_url: null }, "secret", "Prompt");
    expect(result.output.title).toBe("Plan");
  });

  it("parses Gemini JSON output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await generateAssistantOutput({ provider: "gemini", model: "gemini-2.5-flash", base_url: null }, "secret", "Prompt");
    expect(result.output.suggestions).toHaveLength(1);
  });

  it("blocks private compatible endpoints", async () => {
    await expect(generateAssistantOutput({ provider: "openai-compatible", model: "model", base_url: "https://127.0.0.1/v1" }, "secret", "Prompt")).rejects.toThrow("public HTTPS");
  });
});
