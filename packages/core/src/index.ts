import type { OpportunityStage, ToolPermission } from "@roleway/schemas";

const allowedTransitions: Record<OpportunityStage, readonly OpportunityStage[]> = {
  inbox: ["interested", "closed"],
  interested: ["inbox", "preparing", "closed"],
  preparing: ["interested", "applied", "closed"],
  applied: ["interview", "closed"],
  interview: ["applied", "offer", "closed"],
  offer: ["closed"],
  closed: ["interested"],
};

export function canTransitionStage(from: OpportunityStage, to: OpportunityStage): boolean {
  return from === to || allowedTransitions[from].includes(to);
}

export function transitionStage(from: OpportunityStage, to: OpportunityStage): OpportunityStage {
  if (!canTransitionStage(from, to)) throw new Error(`Invalid Opportunity stage transition: ${from} → ${to}`);
  return to;
}

export const toolPermissions = {
  read_job: "read",
  read_profile: "read",
  read_resume: "read",
  get_opportunity: "read",
  search_jobs: "read",
  research_company: "read",
  create_task: "internal_write",
  create_note: "internal_write",
  update_fit_analysis: "internal_write",
  create_document_draft: "internal_write",
  create_resume_version: "reviewable_artifact",
  create_application_plan: "reviewable_artifact",
  create_preparation_plan: "reviewable_artifact",
  send_email: "external",
  submit_application: "external",
  message_contact: "external",
  schedule_event: "external",
} as const satisfies Record<string, ToolPermission>;

export type RolewayToolName = keyof typeof toolPermissions;

export function requiresExplicitApproval(tool: RolewayToolName): boolean {
  const permission = toolPermissions[tool];
  return permission === "reviewable_artifact" || permission === "external";
}
