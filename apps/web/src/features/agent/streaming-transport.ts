import { DefaultChatTransport, type UIMessageChunk } from "ai";
import type { AgentUIMessage } from "./stream-types";

function shouldAnimate() {
  return typeof document !== "undefined" && !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function answerText(chunk: UIMessageChunk) {
  return chunk.type === "data-answer" && chunk.data && typeof chunk.data === "object" &&
    "text" in chunk.data && typeof chunk.data.text === "string" ? chunk.data.text : undefined;
}

/** Read incoming updates without animation backpressure; reveal only the newest preview. */
export function progressiveAnswers(animate = shouldAnimate) {
  const queue: UIMessageChunk[] = [];
  let displayed = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ended = false;
  let stopped = false;
  let output: ReadableStreamDefaultController<UIMessageChunk>;
  let input: WritableStreamDefaultController;
  const stop = () => { stopped = true; clearTimeout(timer); queue.length = 0; };
  const drain = () => {
    timer = undefined;
    if (stopped) return;
    while (queue.length) {
      const chunk = queue[0]!;
      const text = answerText(chunk);
      if (chunk.type === "data-answer" && text !== undefined && text.startsWith(displayed) && text !== displayed && animate()) {
        const remaining = Array.from(text.slice(displayed.length));
        // Catch up proportionally instead of replaying every superseded provider update.
        const step = Math.max(4, Math.ceil(remaining.length / 8));
        displayed += remaining.slice(0, step).join("");
        output.enqueue({ ...chunk, data: { text: displayed } });
        if (displayed === text) queue.shift();
        timer = setTimeout(drain, 16);
        return;
      }
      if (text !== undefined) displayed = text;
      output.enqueue(chunk);
      queue.shift();
    }
    if (ended) { stop(); output.close(); }
  };
  const readable = new ReadableStream<UIMessageChunk>({
    start(controller) { output = controller; },
    cancel(reason) { stop(); input.error(reason); },
  });
  const writable = new WritableStream<UIMessageChunk>({
    start(controller) { input = controller; },
    write(chunk) {
      const previous = queue.at(-1);
      // Keep progress/result/finish boundaries ordered; only adjacent answer snapshots merge.
      if (previous?.type === "data-answer" && chunk.type === "data-answer" &&
          previous.id === chunk.id && answerText(chunk) !== undefined) queue[queue.length - 1] = chunk;
      else queue.push(chunk);
      if (!timer) drain();
    },
    close() { ended = true; if (!timer) drain(); },
    abort(reason) { stop(); output.error(reason); },
  });
  return { readable, writable };
}

export class AgentChatTransport extends DefaultChatTransport<AgentUIMessage> {
  protected override processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>) {
    return super.processResponseStream(stream).pipeThrough(progressiveAnswers());
  }
}
