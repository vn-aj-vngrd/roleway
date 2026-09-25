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

const opportunityId = "33333333-3333-4333-8333-333333333333";
const interview = { interviewType: "Technical", startsAt: "2027-01-15T14:00:00+08:00", durationMinutes: 60, timezone: "Asia/Manila", meetingUrl: null, interviewers: null };
const contact = { name: "Jane", relationship: "recruiter", company: null, role: null, email: null, phone: null, profileUrl: null, notes: null, followUpAt: null };
describe("Interview and contact proposals", () => {
  it("requires an exact interview target and schedule", () => {
    const proposal = { ...workspace, tool: "create_interview", targetId: opportunityId, interview };
    expect(agentProposalSchema.safeParse(proposal).success).toBe(true);
    for (const change of [{ targetId: null }, { interview: null }, { interview: { ...interview, startsAt: "2027-01-15T14:00:00" } }, { interview: { ...interview, durationMinutes: 0 } }, { interview: { ...interview, timezone: "Mars/Olympus" } }, { interview: { ...interview, meetingUrl: "javascript:alert(1)" } }]) {
      expect(agentProposalSchema.safeParse({ ...proposal, ...change }).success).toBe(false);
    }
  });
  it("requires contact identity and Workspace, with an optional Opportunity", () => {
    const proposal = { ...workspace, tool: "create_contact", workspaceId: opportunityId, contact };
    expect(agentProposalSchema.safeParse(proposal).success).toBe(true);
    expect(agentProposalSchema.safeParse({ ...proposal, targetId: opportunityId }).success).toBe(true);
    for (const change of [{ workspaceId: null }, { contact: null }, { contact: { ...contact, name: " " } }, { contact: { ...contact, relationship: "unknown" } }, { contact: { ...contact, email: "not-email" } }, { contact: { ...contact, profileUrl: "javascript:alert(1)" } }]) {
      expect(agentProposalSchema.safeParse({ ...proposal, ...change }).success).toBe(false);
    }
  });
});
