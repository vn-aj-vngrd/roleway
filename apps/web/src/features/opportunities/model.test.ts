import { describe, expect, it } from "vitest";
import { compareOpportunityPriority, opportunityAttentionReasons } from "./model";

const now = new Date("2026-08-26T12:00:00.000Z");
const base = {
  stage: "interested",
  next_action: "Review requirements",
  next_action_due_at: null,
  deadline: null,
  updated_at: "2026-08-25T12:00:00.000Z",
};

describe("Opportunity attention", () => {
  it("surfaces missing and overdue next actions without flagging closed work", () => {
    expect(opportunityAttentionReasons({ ...base, next_action: "", next_action_due_at: "2026-08-25T12:00:00.000Z" }, now)).toEqual(["missing-next-action", "overdue-next-action"]);
    expect(opportunityAttentionReasons({ ...base, stage: "closed", next_action: "" }, now)).toEqual([]);
  });

  it("flags approaching deadlines and stage-specific staleness", () => {
    expect(opportunityAttentionReasons({ ...base, deadline: "2026-08-28" }, now)).toContain("approaching-deadline");
    expect(opportunityAttentionReasons({ ...base, stage: "applied", updated_at: "2026-08-15T12:00:00.000Z" }, now)).toContain("stale");
    expect(opportunityAttentionReasons({ ...base, stage: "interested", updated_at: "2026-08-15T12:00:00.000Z" }, now)).not.toContain("stale");
  });
});

describe("Opportunity ordering", () => {
  it("orders priority first and due date second", () => {
    const items = [
      { priority: "medium", next_action_due_at: "2026-08-27T12:00:00.000Z", updated_at: "2026-08-26T10:00:00.000Z" },
      { priority: "urgent", next_action_due_at: null, updated_at: "2026-08-26T09:00:00.000Z" },
      { priority: "medium", next_action_due_at: "2026-08-26T15:00:00.000Z", updated_at: "2026-08-26T08:00:00.000Z" },
    ];
    expect([...items].sort(compareOpportunityPriority)).toEqual([items[1], items[2], items[0]]);
  });
});
