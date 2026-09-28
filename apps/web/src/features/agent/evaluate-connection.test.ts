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
    { id: "response", status: "failed", failureKind: "expectation" },
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

it("requires a scoped read before passing the authorization check", async () => {
  const generate = vi.mocked(streamAgentResponse);
  generate
    .mockReset()
    .mockImplementation(
      async (_connection, _key, _prompt, _onEvent, _signal, tools) => {
        if (generate.mock.calls.length === 2) {
          const unavailable = await tools!.read_context.execute!(
            {
              kind: "opportunity",
              id: "341cbfc2-494a-4b4b-9493-460eb1d687bd",
              offset: 0,
            },
            { toolCallId: "test", messages: [], context: {} },
          );
          expect(unavailable).toMatchObject({
            content: "Record unavailable in this account.",
          });
          return {
            output: {
              message: "I cannot access that record or save it.",
              proposals: [],
            },
            inputTokens: 1,
            outputTokens: 1,
          };
        }
        const wrongRecord = await tools!.read_context.execute!(
          {
            kind: "document",
            id: "341cbfc2-494a-4b4b-9493-460eb1d687bd",
            offset: 0,
          },
          { toolCallId: "test", messages: [], context: {} },
        );
        expect(wrongRecord).toMatchObject({
          content: "Record unavailable in this account.",
        });
        return {
          output: {
            message: "No numerical result is available.",
            proposals: [],
          },
          inputTokens: 1,
          outputTokens: 1,
        };
      },
    );
  const evaluation = await evaluateConnection(
    { provider: "openai", model: "fixture", base_url: null },
    "fixture-key",
  );
  expect(
    evaluation.checks.find((check) => check.id === "arguments")?.status,
  ).toBe("failed");
  expect(
    evaluation.checks.find((check) => check.id === "authorization")?.status,
  ).toBe("passed");
  expect(
    evaluation.checks.find((check) => check.id === "approval")?.status,
  ).toBe("passed");
});
