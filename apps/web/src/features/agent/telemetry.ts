import "server-only";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("roleway-agent");

/** Span names are fixed; never attach prompts, IDs, arguments, or raw errors. */
export async function traceAgentDb<T>(
  name: "context" | "tool_read" | "complete",
  operation: () => PromiseLike<T>,
): Promise<T> {
  const span = tracer.startSpan(`agent.db.${name}`);
  try {
    const result = await operation();
    span.setAttribute("agent.status", "ok");
    return result;
  } catch (error) {
    span.setAttribute("agent.status", "error");
    throw error;
  } finally {
    span.end();
  }
}
