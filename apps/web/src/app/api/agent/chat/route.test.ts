import { describe, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/features/agent/run-request", () => ({ runAgentRequest: run }));
import { POST } from "./route";

describe("Agent streaming route", () => {
  it("rejects cross-origin requests before running the Agent", async () => {
    run.mockClear();
    const response = await POST(new Request("https://roleway.test/api/agent/chat", { method: "POST", headers: { origin: "https://other.test" }, body: "{}" }));
    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects malformed or oversized request bodies", async () => {
    for (const body of ["null", "[]", "invalid", "x".repeat(40_001)]) {
      const response = await POST(new Request("https://roleway.test/api/agent/chat", { method: "POST", headers: { origin: "https://roleway.test" }, body }));
      expect([400, 413]).toContain(response.status);
    }
  });
  it("streams only public progress and a safe generic error on an unexpected failure", async () => {
    run.mockRejectedValueOnce(new Error("private-provider-key-and-prompt"));
    const response = await POST(new Request("https://roleway.test/api/agent/chat", { method: "POST", headers: { origin: "https://roleway.test" }, body: JSON.stringify({ message: "Hello", secret: "ignored" }) }));
    const body = await response.text();
    expect(body).toContain("connection was interrupted");
    expect(body).not.toContain("private-provider");
    expect((run.mock.calls.at(-1)![0] as FormData).has("secret")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
