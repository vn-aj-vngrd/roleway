import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { progressiveAnswers } from "./streaming-transport";

const answer = (text: string): UIMessageChunk => ({ type: "data-answer", id: "answer", data: { text } });
function textOf(chunk: UIMessageChunk) {
  return chunk.type === "data-answer" ? (chunk.data as { text: string }).text : undefined;
}
async function collect(chunks: UIMessageChunk[], animate = () => true) {
  const output: UIMessageChunk[] = [];
  await new ReadableStream<UIMessageChunk>({
    start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close(); },
  }).pipeThrough(progressiveAnswers(animate)).pipeTo(new WritableStream({
    write(chunk) { output.push(chunk); },
  }));
  return output;
}

describe("progressive Agent answers", () => {
  it("reveals text before the network response finishes", async () => {
    let source!: ReadableStreamDefaultController<UIMessageChunk>;
    const stream = new ReadableStream<UIMessageChunk>({ start(controller) { source = controller; } });
    const reader = stream.pipeThrough(progressiveAnswers(() => true)).getReader();
    source.enqueue(answer("Hello world"));
    expect(textOf((await reader.read()).value!)).toBe("Hell");
    expect(textOf((await reader.read()).value!)).toBe("Hello wo");
    expect(textOf((await reader.read()).value!)).toBe("Hello world");
    source.close();
    expect((await reader.read()).done).toBe(true);
  });

  it("preserves exact Markdown and Unicode and delivers completion after the answer", async () => {
    const text = "**Hello** 🌍\n\n- First\n- Second";
    const result: UIMessageChunk = { type: "data-result", data: { href: "/agent?conversation=1" }, transient: true };
    const output = await collect([answer("**Hello**"), answer(text), result, { type: "finish" }]);
    const previews = output.map(textOf).filter((value): value is string => value !== undefined);
    expect(previews.length).toBeGreaterThan(2);
    expect(previews.every(value => text.startsWith(value))).toBe(true);
    expect(previews.at(-1)).toBe(text);
    expect(output.slice(-2)).toEqual([result, { type: "finish" }]);
  });

  it("replaces repairs without appending the rejected draft", async () => {
    const output = await collect([answer("Draft answer"), answer(""), answer("New answer"), answer("Which date?")]);
    expect(output.some(chunk => textOf(chunk) === "")).toBe(true);
    expect(textOf(output.at(-1)!)).toBe("Which date?");
  });

  it("does not animate background or reduced-motion responses", async () => {
    const chunks = [answer("All the text"), { type: "finish" } as const];
    expect(await collect(chunks, () => false)).toEqual(chunks);
  });

  it("flushes remaining text when animation becomes disabled", async () => {
    let calls = 0;
    const output = await collect([answer("A long incoming answer")], () => ++calls < 3);
    expect(output.map(textOf)).toEqual(["A lo", "A long incoming answer"]);
  });
});
