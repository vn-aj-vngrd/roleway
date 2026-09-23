import type { UIMessage } from "ai";

export type RunProgress = {
  id: string;
  label: string;
  status: "active" | "completed" | "failed";
};
export type AgentStreamEvent =
  | { type: "progress"; data: RunProgress }
  | { type: "answer"; text: string }
  | { type: "started"; conversationId: string; runId: string };
export type AgentUIMessage = UIMessage<never, {
  progress: RunProgress;
  answer: { text: string };
  started: { conversationId: string; runId: string };
  result: { href: string };
}>;
