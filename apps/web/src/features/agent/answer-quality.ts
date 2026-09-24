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
