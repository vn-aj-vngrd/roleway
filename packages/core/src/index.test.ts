import { describe, expect, it } from "vitest";
import { canTransitionStage, requiresExplicitApproval, transitionStage } from "./index";

describe("Opportunity stage transitions", () => {
  it("allows a prepared Opportunity to become applied", () => {
    expect(transitionStage("preparing", "applied")).toBe("applied");
  });

  it("rejects skipping from inbox to offer", () => {
    expect(canTransitionStage("inbox", "offer")).toBe(false);
    expect(() => transitionStage("inbox", "offer")).toThrow(/Invalid Opportunity/);
  });
});

describe("agent tool permissions", () => {
  it("allows reads without approval and gates artifacts/external work", () => {
    expect(requiresExplicitApproval("read_job")).toBe(false);
    expect(requiresExplicitApproval("create_resume_version")).toBe(true);
    expect(requiresExplicitApproval("submit_application")).toBe(true);
  });
});
