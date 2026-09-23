export type AttentionReason = "missing-next-action" | "overdue-next-action" | "approaching-deadline" | "stale";

export type OpportunityAttentionInput = {
  stage: string;
  next_action: string | null;
  next_action_due_at: string | null;
  deadline: string | null;
  updated_at: string;
};

const DAY = 86_400_000;

export function opportunityAttentionReasons(item: OpportunityAttentionInput, now = new Date()): AttentionReason[] {
  if (item.stage === "closed") return [];
  const reasons: AttentionReason[] = [];
  const nowTime = now.getTime();

  if (!item.next_action?.trim()) reasons.push("missing-next-action");
  if (item.next_action_due_at && new Date(item.next_action_due_at).getTime() < nowTime) reasons.push("overdue-next-action");
  if (item.deadline) {
    const deadline = new Date(`${item.deadline}T23:59:59`).getTime();
    if (deadline >= nowTime && deadline - nowTime <= 3 * DAY) reasons.push("approaching-deadline");
  }

  const staleAfterDays = item.stage === "applied" ? 10 : item.stage === "interview" || item.stage === "offer" ? 5 : 14;
  if (nowTime - new Date(item.updated_at).getTime() >= staleAfterDays * DAY) reasons.push("stale");
  return reasons;
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function compareOpportunityPriority<T extends { priority: string; next_action_due_at: string | null; updated_at: string }>(left: T, right: T) {
  const priorityDifference = (priorityOrder[left.priority] ?? 4) - (priorityOrder[right.priority] ?? 4);
  if (priorityDifference) return priorityDifference;
  const leftDue = left.next_action_due_at ? new Date(left.next_action_due_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightDue = right.next_action_due_at ? new Date(right.next_action_due_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) return leftDue - rightDue;
  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}
