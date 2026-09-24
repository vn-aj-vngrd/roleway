import type { AgentGeneration, AgentResponse } from "@roleway/schemas";

// Catch a short introductory paragraph with no promised content or approval card.
// This is deliberately narrow: short greetings and clarification questions are valid.
export function isUnfinishedIntroduction(output: {
  message: string;
  proposals: unknown[];
}) {
  const message = output.message.trim();
  return (
    output.proposals.length === 0 &&
    message.length <= 600 &&
    !message.includes("\n") &&
    message.endsWith(":")
  );
}

export const answerRepairInstruction =
  "Response requirement: The previous attempt ended with an introduction and omitted the answer. Return a complete, self-contained response in the message field, including any content you introduce. For a greeting, a brief greeting and a question are sufficient. Do not invent missing context.";

const clarificationQuestions: Record<NonNullable<AgentGeneration["clarification"]>, string> = {
  workspace_name: "What would you like to name this Workspace?",
  workspace_objective: "What is the job-search objective for this Workspace?",
  opportunity: "Which Opportunity should this change belong to?",
  title: "What title should I use for this task or Next Action?",
  note: "What would you like to record in the note?",
  due_date_choice: "Would you like a due date, or should I leave it without one?",
  due_date: "What exact date and time do you mean? Please include AM/PM or use a 24-hour time, and confirm the timezone if it differs from your current one.",
};

export function resolveAgentAnswer(output: AgentGeneration): AgentResponse {
  // A request for clarification cannot also offer an actionable approval card.
  if (output.clarification) return { message: clarificationQuestions[output.clarification], proposals: [] };
  return { message: output.message, proposals: output.proposals };
}
