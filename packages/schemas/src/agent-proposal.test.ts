import { describe, expect, it } from "vitest";
import { agentProposalSchema } from "./index";

const workspace = { tool: "create_workspace", summary: "Create a focused search", targetId: null, name: "Engineering search", objective: "Find a TypeScript role", title: null, body: null, dueAt: null };
describe("Agent creation completeness", () => {
  it.each([null, "", "   "])("rejects an absent Workspace objective: %s", objective => {
    expect(agentProposalSchema.safeParse({ ...workspace, objective }).success).toBe(false);
  });
  it("accepts a Workspace only with its required name and objective", () => {
    expect(agentProposalSchema.safeParse(workspace).success).toBe(true);
    expect(agentProposalSchema.safeParse({ ...workspace, name: null }).success).toBe(false);
  });
  it.each(["create_task", "set_next_action"])("allows the explicit no-date choice for %s", tool => {
    expect(agentProposalSchema.safeParse({ ...workspace, tool, targetId: "33333333-3333-4333-8333-333333333333", title: "Prepare examples", name: null, objective: null, dueAt: null }).success).toBe(true);
  });
});
