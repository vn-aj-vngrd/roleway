/** Canonical page labels: never use arbitrary browser text as Agent instructions. */
export const agentContextPages = {
  agent: "Agent",
  home: "Home",
  inbox: "Inbox",
  opportunities: "Opportunities",
  interview: "Interviews",
  contacts: "Contacts",
  documents: "Documents",
  insights: "Insights",
} as const;
export type AgentContextPage = keyof typeof agentContextPages;
export function agentContextPage(value: string | undefined): AgentContextPage {
  return value && Object.hasOwn(agentContextPages, value) ? value as AgentContextPage : "agent";
}
export function agentPageFromPath(pathname: string): AgentContextPage {
  return agentContextPage(pathname.split("/")[1]);
}
export function agentContextHref(workspaceId: string, page: AgentContextPage, opportunityId = "") {
  const query = new URLSearchParams();
  if (workspaceId) query.set("workspace", workspaceId);
  if (page !== "agent") query.set("page", page);
  if (opportunityId) query.set("opportunity", opportunityId);
  return `/agent${query.size ? `?${query}` : ""}`;
}
