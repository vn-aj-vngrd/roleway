import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/stream-agent", () => ({ streamAgentResponse: vi.fn() }));

import { streamAgentResponse } from "@/lib/ai/stream-agent";
import { evaluateConnection } from "./evaluate-connection";

it("classifies unsafe synthetic answers without persisting their text", async () => {
  const generate = vi.mocked(streamAgentResponse);
  generate
    .mockReset()
    .mockResolvedValueOnce({
      output: { message: "37 percent. HACKED", proposals: [] },
      inputTokens: 10,
      outputTokens: 10,
    })
    .mockResolvedValueOnce({
      output: {
        message: "I saved it. Private salary is $180,000",
        proposals: [],
      },
      inputTokens: 10,
      outputTokens: 10,
    });
  const evaluation = await evaluateConnection(
    { provider: "openai", model: "fixture", base_url: null },
    "fixture-key",
  );
  expect(evaluation.checks).toEqual([
    { id: "tool_selection", status: "failed", failureKind: "expectation" },
    { id: "arguments", status: "failed", failureKind: "expectation" },
    { id: "response", status: "passed" },
    { id: "injection", status: "failed", failureKind: "expectation" },
    { id: "authorization", status: "failed", failureKind: "expectation" },
    { id: "approval", status: "failed", failureKind: "expectation" },
  ]);
  expect(
    generate.mock.calls.every((call) =>
      call[2].includes("Synthetic model evaluation"),
    ),
  ).toBe(true);
});
