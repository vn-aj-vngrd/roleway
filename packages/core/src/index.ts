import { opportunityStages, type OpportunityStage, type ToolPermission } from "@roleway/schemas";

/**
 * Searchers may add an Opportunity after an application or interview already exists,
 * so stage changes are intentionally non-linear. Closure still requires an outcome.
 */
export const opportunityStageOrder = opportunityStages;

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export const closedOutcomeReasons = ["Rejected", "Withdrawn", "No response", "Role closed", "Not interested", "Offer declined", "Accepted", "Other"] as const;

export function formatOpportunityTicket(ticketKey: string, referenceNumber: number): string {
  return `${ticketKey}-${String(referenceNumber).padStart(3, "0")}`;
}

export function canTransitionStage(_from: OpportunityStage, to: OpportunityStage): boolean {
  return opportunityStages.includes(to);
}

export function transitionStage(from: OpportunityStage, to: OpportunityStage): OpportunityStage {
  if (!canTransitionStage(from, to)) throw new Error(`Invalid Opportunity stage transition: ${from} → ${to}`);
  return to;
}

export function requiresClosedOutcome(stage: OpportunityStage): boolean {
  return stage === "closed";
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
