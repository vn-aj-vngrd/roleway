import { DefaultChatTransport, type UIMessageChunk } from "ai";
import type { AgentUIMessage } from "./stream-types";

function shouldAnimate() {
  return typeof document !== "undefined" && !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Smooth incoming answer chunks, never replay saved messages or delay server work. */
export function progressiveAnswers(animate = shouldAnimate) {
  let displayed = "";
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    async transform(chunk, controller) {
      if (chunk.type !== "data-answer" || !chunk.data || typeof chunk.data !== "object" ||
          !("text" in chunk.data) || typeof chunk.data.text !== "string") {
        controller.enqueue(chunk);
        return;
      }
      const text = chunk.data.text;
      // Repairs and validated clarifications can replace, rather than append to, a draft.
      if (!text.startsWith(displayed) || !animate()) {
        displayed = text;
        controller.enqueue(chunk);
        return;
      }
      const incoming = Array.from(text.slice(displayed.length));
      // Small token-like increments; catch up a large provider burst in at most ~1.3s.
      const step = Math.max(4, Math.ceil(incoming.length / 80));
      for (let offset = 0; offset < incoming.length; offset += step) {
        if (!animate()) {
          displayed = text;
          controller.enqueue(chunk);
          return;
        }
        displayed += incoming.slice(offset, offset + step).join("");
        controller.enqueue({ ...chunk, data: { ...chunk.data, text: displayed } });
        // Yield even after the last increment so a queued finish cannot hide the reveal.
        await new Promise(resolve => setTimeout(resolve, 16));
      }
      if (!incoming.length) controller.enqueue(chunk);
    },
  });
}

export class AgentChatTransport extends DefaultChatTransport<AgentUIMessage> {
  protected override processResponseStream(stream: ReadableStream<Uint8Array<ArrayBufferLike>>) {
    // Keep result/finish events behind the visible answer, including route refreshes.
    return super.processResponseStream(stream).pipeThrough(progressiveAnswers());
  }
}
