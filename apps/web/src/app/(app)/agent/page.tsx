// OpenRouter free models may queue for minutes; leave time for bounded calls and persistence.
export const maxDuration = 300;

import "./agent-chat.css";
import { AgentMarkdown } from "@/features/agent/markdown";
import { AgentMessageInput, MessageActions, MessageTimestamp, SavedResultFocus } from "@/features/agent/chat-controls";
import { formatOpportunityTicket } from "@roleway/core";
import { Archive, Check, ChevronDown, Circle, History, KeyRound, Navigation, Plus, Route, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveAgentConversation, decideAgentProposal, sendAgentMessage, openAgentResult } from "./actions";

type Connection = { id: string; label: string; provider: string; model: string; status: string };
type Opportunity = { id: string; project_id: string; reference_number: number; next_action: string | null; jobs: { company: string; title: string } | null };
type Conversation = { id: string; project_id: string; title: string; opportunity_id: string | null; updated_at: string };
type Message = { id: string; role: "user" | "agent"; content: string; run_id: string | null; created_at: string };
type Run = { id: string; provider: string; model: string; status: string; input_tokens: number | null; output_tokens: number | null; created_at: string };
type Step = { id: string; run_id: string; label: string; status: "pending" | "active" | "completed" | "failed"; position: number };
type Proposal = { id: string; run_id: string; tool_name: string; target_id: string | null; destination_project_id: string | null; summary: string; arguments: Record<string, unknown>; status: string; created_at: string };

type AgentQuery = { conversation?: string; opportunity?: string; error?: string; decision?: string; record?: string; proposal?: string };

export default async function AgentPage(props: { searchParams: Promise<AgentQuery> }) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const admin = createAdminClient();
  const [connectionsResult, opportunitiesResult, conversationsResult] = await Promise.all([
    admin.from("ai_connections").select("id, label, provider, model, status").eq("user_id", context.user.id).order("updated_at", { ascending: false }),
    context.supabase.from("opportunities").select("id, project_id, reference_number, next_action, jobs(company, title)").eq("user_id", context.user.id).in("project_id", context.projects.map((workspace) => workspace.id)).neq("stage", "closed").order("updated_at", { ascending: false }),
    context.supabase.from("agent_conversations").select("id, project_id, title, opportunity_id, updated_at").eq("user_id", context.user.id).eq("status", "active").order("updated_at", { ascending: false }).limit(40),
  ]);
  const connections = (connectionsResult.data ?? []) as Connection[];
  const readyConnections = connections.filter((connection) => connection.status === "connected");
  const opportunities = (opportunitiesResult.data ?? []) as unknown as Opportunity[];
  const conversations = (conversationsResult.data ?? []) as Conversation[];
  const { data: selectedConversation } = query.conversation
    ? await context.supabase.from("agent_conversations").select("id, project_id, title, opportunity_id, updated_at").eq("id", query.conversation).eq("user_id", context.user.id).eq("status", "active").maybeSingle()
    : { data: null };
  const activeConversation = selectedConversation as Conversation | null;
  if (query.conversation && !activeConversation) redirect("/agent?error=That%20conversation%20is%20not%20available.");

  let messages: Message[] = [];
  let runs: Run[] = [];
  let steps: Step[] = [];
  let proposals: Proposal[] = [];
  if (activeConversation) {
    const [messagesResult, runsResult, stepsResult, proposalsResult] = await Promise.all([
      context.supabase.from("agent_messages").select("id, role, content, run_id, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: false }).limit(200),
      context.supabase.from("ai_runs").select("id, provider, model, status, input_tokens, output_tokens, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("agent_run_steps").select("id, run_id, label, status, position").eq("conversation_id", activeConversation.id).order("position", { ascending: true }).limit(300),
      context.supabase.from("agent_proposals").select("id, run_id, tool_name, target_id, destination_project_id, summary, arguments, status, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: false }).limit(100),
    ]);
    messages = ((messagesResult.data ?? []) as Message[]).reverse();
    runs = (runsResult.data ?? []) as Run[];
    steps = (stepsResult.data ?? []) as Step[];
    proposals = (proposalsResult.data ?? []) as Proposal[];
  }

  const opportunityMap = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const projectMap = new Map(context.projects.map((item) => [item.id, { name: item.name, ticketKey: item.ticket_key }]));
  const queryFocus = opportunities.some((opportunity) => opportunity.id === query.opportunity) ? query.opportunity : "";
  const focusedOpportunityId = activeConversation?.opportunity_id ?? queryFocus ?? "";

  return (
    <div className={`agent-native-page ${activeConversation ? "has-conversation" : "is-empty"}`}>
      <header className="agent-native-routebar">
        <details className="agent-history-menu">
          <summary aria-label="Open Agent conversation history"><History aria-hidden="true" /><span>{activeConversation?.title ?? "New conversation"}</span><ChevronDown aria-hidden="true" /></summary>
          <div className="agent-history-popover floating-panel">
            <div className="agent-history-popover-head"><strong>Conversations</strong><Link href="/agent"><Plus aria-hidden="true" />New</Link></div>
            <div className="agent-history-list">
              {conversations.length ? conversations.map((conversation) => {
                const active = conversation.id === activeConversation?.id;
                const focus = conversation.opportunity_id ? opportunityMap.get(conversation.opportunity_id) : null;
                const subtitle = focus?.jobs ? `${focus.jobs.company} · ${focus.jobs.title}` : projectMap.get(conversation.project_id)?.name ?? "All workspaces";
                return <div className={`agent-history-row ${active ? "active" : ""}`} key={conversation.id}>
                  <Link href={`/agent?conversation=${conversation.id}`} aria-current={active ? "page" : undefined}><span>{conversation.title}</span><small>{subtitle} · {relativeDate(conversation.updated_at)}</small></Link>
                  <form action={archiveAgentConversation}><input type="hidden" name="conversationId" value={conversation.id} /><button aria-label={`Archive ${conversation.title}`} data-tooltip="Archive conversation"><Archive aria-hidden="true" /></button></form>
                </div>;
              }) : <p className="agent-history-empty">No conversations yet.</p>}
            </div>
          </div>
        </details>
        <Link href="/help/agent-create" className="agent-help-link">Creation guide</Link>
        <span className="agent-native-scope"><Route aria-hidden="true" />All workspaces</span>
        <Link className="agent-new-chat" href="/agent"><Plus aria-hidden="true" /><span>New conversation</span></Link>
      </header>

      {query.proposal && proposals.some(proposal => proposal.id === query.proposal && proposal.status === "applied") ? <SavedResultFocus proposalId={query.proposal} /> : null}
      {query.error ? <div className="agent-inline-state error" role="alert"><X aria-hidden="true" /><span>{query.error}</span></div> : null}
      {query.decision === "applied" ? <div className="agent-inline-state success" role="status"><Check aria-hidden="true" /><span>Saved successfully. You can open the result below.</span></div> : null}
      {query.decision === "unchanged" ? <div className="agent-inline-state" role="status"><Circle aria-hidden="true" /><span>No change applied. If the proposal expired, ask Agent for a fresh proposal using your current records.</span></div> : null}
      {query.decision === "rejected" ? <div className="agent-inline-state" role="status"><Circle aria-hidden="true" /><span>Proposal rejected. No Roleway record changed.</span></div> : null}

      <main className="agent-native-workplane">
        {activeConversation ? <div className="agent-transcript" aria-label="Agent conversation">
          {messages.map((message) => {
            const run = message.run_id ? runs.find((item) => item.id === message.run_id) : null;
            const runSteps = message.run_id ? steps.filter((step) => step.run_id === message.run_id) : [];
            const runProposals = message.run_id ? proposals.filter((proposal) => proposal.run_id === message.run_id) : [];
            return (
              <article className={`agent-message ${message.role}`} key={message.id}>
                <MessageTimestamp value={message.created_at} />
                <div className="agent-message-body"><header><span className="agent-message-author">{message.role === "agent" ? <><Navigation aria-hidden="true" />Roleway Agent</> : "You"}</span></header>
                <div className="agent-message-content">{message.role === "agent" ? <AgentMarkdown content={message.content} idPrefix={message.id} /> : <p>{message.content}</p>}</div>
                <MessageActions content={message.content} /></div>
                {run && (message.role === "agent" || run.status === "failed") ? <AgentRunDetails run={run} steps={runSteps} /> : null}
                {(message.role === "agent" ? runProposals : []).map((proposal) => <ApprovalCard createdWorkspaceId={query.proposal === proposal.id && query.decision === "applied" && projectMap.has(query.record ?? "") ? query.record : undefined} workspace={proposal.destination_project_id ? projectMap.get(proposal.destination_project_id)?.name ?? "Unavailable Workspace" : undefined} proposal={proposal} opportunity={proposal.target_id ? opportunityMap.get(proposal.target_id) : undefined} key={proposal.id} />)}
              </article>
            );
          })}
        </div> : <div className="agent-empty-state">
          <div className="agent-waypoint-watermark" aria-hidden="true"><Navigation /></div>
          <div className="agent-empty-copy"><h1>Ask across your search.</h1><p>Agent can read context from all of your Workspaces. It answers questions, prepares drafts, and proposes Workspace-specific changes for your approval.</p></div>
          <p className="agent-prompt-examples">Use + or / below to create work or explore your search.</p>
        </div>}

        <AgentComposer
          messageKey={messages.at(-1)?.id ?? "new"}
          conversationId={activeConversation?.id ?? ""}
          connections={readyConnections}
          opportunities={opportunities}
          focusedOpportunityId={focusedOpportunityId}
          projects={projectMap}
        />
      </main>
    </div>
  );
}

function AgentComposer({ messageKey, conversationId, connections, opportunities, focusedOpportunityId, projects }: { messageKey: string; conversationId: string; connections: Connection[]; opportunities: Opportunity[]; focusedOpportunityId: string; projects: Map<string, { name: string; ticketKey: string }> }) {
  if (!connections.length) return <section className="agent-native-composer agent-composer-disabled" aria-label="Connect an AI provider to use Agent"><label className="sr-only" htmlFor="disabled-agent-message">Message Roleway Agent</label><textarea id="disabled-agent-message" disabled placeholder="Connect a provider to ask Agent…" /><footer><span className="agent-context-disclosure"><KeyRound aria-hidden="true" />Your API key is encrypted before storage</span><Link className="agent-setup-link" href="/settings/ai">Set up connection</Link></footer></section>;
  return <form action={sendAgentMessage} className="agent-native-composer" key={conversationId}>
    <input type="hidden" name="conversationId" value={conversationId} />
    <AgentMessageInput key={messageKey} connections={connections} focusedOpportunityId={focusedOpportunityId} fixedFocus={Boolean(conversationId)} opportunities={opportunities.map(opportunity => ({
      id: opportunity.id,
      label: `${projects.get(opportunity.project_id)?.name ?? "Workspace"} · ${formatOpportunityTicket(projects.get(opportunity.project_id)?.ticketKey ?? "RW", opportunity.reference_number)} · ${opportunity.jobs?.company} · ${opportunity.jobs?.title}`,
    }))} />
  </form>;
}

function AgentRunDetails({ run, steps }: { run: Run; steps: Step[] }) {
  return <details className="agent-run-details">
    <summary><span className={`agent-run-state ${run.status}`}><Check aria-hidden="true" /></span><span>{run.status === "awaiting_approval" ? "Answer ready · approval requested" : run.status === "failed" ? "Run failed safely" : "Context and model details"}</span><ChevronDown aria-hidden="true" /></summary>
    <div>{steps.map((step) => <p className={`agent-step ${step.status}`} key={step.id}><span>{step.status === "completed" ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}</span>{step.label}</p>)}<p className="agent-run-model">{run.provider} · {run.model}{run.input_tokens || run.output_tokens ? ` · ${run.input_tokens ?? 0} in / ${run.output_tokens ?? 0} out` : ""}</p></div>
  </details>;
}

function ApprovalCard({ proposal, opportunity, workspace, createdWorkspaceId }: { createdWorkspaceId: string | undefined; proposal: Proposal; opportunity: Opportunity | undefined; workspace: string | undefined }) {
  const feedback = creationFeedback[proposal.tool_name];
  const details = proposalDetails(proposal, opportunity);
  if (workspace) details.unshift(["Workspace", workspace]);
  return <section id={`proposal-${proposal.id}`} className={`agent-approval-card ${proposal.status}`} aria-label="Agent proposed change">
    <header><span><Navigation aria-hidden="true" />{proposal.status === "proposed" ? "Approval required" : proposal.status === "applied" ? "Saved result" : "Proposal"}</span><strong>{toolLabel(proposal.tool_name)}</strong></header>
    <p>{proposal.summary}</p>
    <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {proposal.status === "proposed" ? <footer>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="reject" /><SubmitButton className="button ghost" pendingLabel="Rejecting…">Reject</SubmitButton></form>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="approve" /><SubmitButton pendingLabel={feedback?.pending ?? "Saving…"}>Approve change</SubmitButton></form>
    </footer> : <div className="agent-approval-outcome" tabIndex={-1}><span className={`agent-proposal-status ${proposal.status}`}><Check aria-hidden="true" />{proposal.status === "applied" ? feedback?.success ?? "Saved" : proposal.status === "rejected" ? "Rejected" : proposal.status === "failed" ? "Could not apply" : proposal.status}</span>{proposal.status === "applied" ? proposal.tool_name === "create_workspace" ? <Link className="button secondary" href={createdWorkspaceId ? `/settings/workspaces/${createdWorkspaceId}` : "/settings/workspaces"}>{createdWorkspaceId ? "Open Workspace" : "View Workspaces"}</Link> : <form action={openAgentResult}><input type="hidden" name="proposalId" value={proposal.id} /><SubmitButton variant="outline" pendingLabel="Opening…">{feedback?.open ?? "Open Opportunity"}</SubmitButton></form> : null}</div>}
  </section>;
}

function proposalDetails(proposal: Proposal, opportunity?: Opportunity): Array<[string, string]> {
  const args = proposal.arguments;
  const target = opportunity?.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : "Unavailable Opportunity";
  if (proposal.tool_name === "create_workspace") return [["Workspace", String(args.name ?? "Untitled")], ["Objective", String(args.objective ?? "Focused job search")]];
  if (proposal.tool_name === "create_task") return [["Opportunity", target], ["Task", String(args.title ?? "Untitled")], ["Due", args.dueAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(args.dueAt))) : "No due date"]];
  if (proposal.tool_name === "set_next_action") return [["Opportunity", target], ["Next Action", String(args.title ?? "Untitled")], ["Due", args.dueAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(args.dueAt))) : "No due date"]];
  return [["Opportunity", target], ["Note", String(args.body ?? "")]];
}

function toolLabel(tool: string) {
  return ({ create_workspace: "Create Workspace", create_task: "Create task", set_next_action: "Update Next Action", create_note: "Add note" } as Record<string, string>)[tool] ?? "Change Roleway record";
}

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`;
}

const creationFeedback: Record<string, { pending: string; success: string; open: string }> = {
  create_workspace: { pending: "Creating Workspace…", success: "Workspace created", open: "Open Workspace" },
  create_task: { pending: "Creating task…", success: "Task created", open: "Open task" },
  create_note: { pending: "Creating note…", success: "Note created", open: "Open note" },
  set_next_action: { pending: "Setting Next Action…", success: "Next Action saved", open: "Open Next Action" },
};
