import { describe, expect, it } from "vitest";
import { canTransitionStage, formatOpportunityTicket, opportunityStageOrder, requiresClosedOutcome, requiresExplicitApproval, transitionStage } from "./index";

describe("Opportunity stage transitions", () => {
  it("allows non-linear updates when an existing search is captured late", () => {
    expect(transitionStage("interested", "interview")).toBe("interview");
    expect(canTransitionStage("offer", "preparing")).toBe(true);
  });

  it("keeps intake in the Job Inbox instead of an Opportunity stage", () => {
    expect(opportunityStageOrder).not.toContain("inbox");
  });

  it("requires an outcome when work closes", () => {
    expect(requiresClosedOutcome("closed")).toBe(true);
    expect(requiresClosedOutcome("offer")).toBe(false);
  });
});

describe("Opportunity identifiers", () => {
  it("combines the Workspace key with the durable reference number", () => {
    expect(formatOpportunityTicket("PLD", 87)).toBe("PLD-087");
  });
});

describe("agent tool permissions", () => {
  it("allows reads without approval and gates artifacts/external work", () => {
    expect(requiresExplicitApproval("read_job")).toBe(false);
    expect(requiresExplicitApproval("create_resume_version")).toBe(true);
    expect(requiresExplicitApproval("submit_application")).toBe(true);
  });
});
