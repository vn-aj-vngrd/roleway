import { agentInterviewSchema, agentContactSchema } from "@roleway/schemas";
import { agentContextPage, agentContextPages, type AgentContextPage } from "@/features/agent/scope";
// OpenRouter free models may queue for minutes; leave time for bounded calls and persistence.
export const maxDuration = 300;

import { formatConversationAge } from "@/features/agent/message-time";
import { AgentLiveProvider, AgentStreamForm, AgentTranscript, AgentConversationLink, AgentPersistedMessage } from "@/features/agent/live-chat";
import { AgentActivityIndicator } from "@/features/agent/session-provider";
import { RunTimeline } from "@/features/agent/run-timeline";
import { AgentMarkdown } from "@/features/agent/markdown";
import { AgentMessageInput, AgentHistoryMenu, AgentNotice, MessageActions, SavedResultFocus } from "@/features/agent/chat-controls";
import { formatOpportunityTicket } from "@roleway/core";
import { Archive, ArrowUpRight, Check, ChevronDown, Circle, History, KeyRound, Navigation, Plus, Route, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveAgentConversation, decideAgentProposal, sendAgentMessage, openAgentResult } from "./actions";

type Connection = { id: string; label: string; provider: string; model: string; status: string };
type Opportunity = { id: string; project_id: string; reference_number: number; next_action: string | null; jobs: { company: string; title: string } | null };
type Conversation = { scope_mode: "account" | "workspace"; context_page: AgentContextPage; id: string; project_id: string; title: string; opportunity_id: string | null; updated_at: string };
type Message = { id: string; role: "user" | "agent"; content: string; run_id: string | null; created_at: string };
type Run = { id: string; provider: string; model: string; status: string; input_tokens: number | null; output_tokens: number | null; created_at: string };
type Step = { id: string; run_id: string; label: string; status: "pending" | "active" | "completed" | "failed"; position: number; created_at: string };
type Proposal = { id: string; run_id: string; tool_name: string; target_id: string | null; destination_project_id: string | null; summary: string; arguments: Record<string, unknown>; status: string; created_at: string };

type AgentQuery = { new?: string; workspace?: string; page?: string; draft?: string; conversation?: string; opportunity?: string; error?: string; decision?: string; record?: string; proposal?: string };

export default async function AgentPage(props: { searchParams: Promise<AgentQuery> }) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const admin = createAdminClient();
  const [connectionsResult, opportunitiesResult, conversationsResult] = await Promise.all([
    admin.from("ai_connections").select("id, label, provider, model, status").eq("user_id", context.user.id).order("updated_at", { ascending: false }),
    context.supabase.from("opportunities").select("id, project_id, reference_number, next_action, jobs(company, title)").eq("user_id", context.user.id).in("project_id", context.projects.map((workspace) => workspace.id)).neq("stage", "closed").order("updated_at", { ascending: false }),
    context.supabase.from("agent_conversations").select("*").eq("user_id", context.user.id).eq("status", "active").order("updated_at", { ascending: false }).limit(40),
  ]);
  const connections = (connectionsResult.data ?? []) as Connection[];
  const readyConnections = connections.filter((connection) => connection.status === "connected");
  const opportunities = (opportunitiesResult.data ?? []) as unknown as Opportunity[];
  const conversations = (conversationsResult.data ?? []) as Conversation[];
  const { data: selectedConversation } = query.conversation
    ? await context.supabase.from("agent_conversations").select("*").eq("id", query.conversation).eq("user_id", context.user.id).eq("status", "active").maybeSingle()
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
      context.supabase.from("agent_run_steps").select("id, run_id, label, status, position, created_at").eq("conversation_id", activeConversation.id).order("position", { ascending: true }).limit(300),
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
  const queryWorkspace = context.projects.some(project => project.id === query.workspace) ? query.workspace! : "";
  const focusedWorkspaceId = activeConversation
    ? activeConversation.scope_mode === "workspace" ? activeConversation.project_id : ""
    : (queryFocus ? opportunityMap.get(queryFocus)?.project_id : queryWorkspace) ?? "";
  const contextPage = activeConversation ? agentContextPage(activeConversation.context_page) : agentContextPage(query.page);
  const scopeLabel = focusedWorkspaceId ? projectMap.get(focusedWorkspaceId)?.name ?? "Workspace unavailable" : "All workspaces";

  const pendingRun = runs.find(run => ["queued", "gathering_context", "generating"].includes(run.status) && Date.now() - Date.parse(run.created_at) < 300_000);

  return (
    <AgentLiveProvider conversationId={activeConversation?.id ?? ""} pendingRunId={pendingRun?.id} draftId={query.new ?? `${query.workspace ?? ""}:${query.opportunity ?? ""}:${query.page ?? ""}:${query.draft ?? ""}:${query.error ?? ""}`} persistedRunIds={messages.flatMap(message => message.role === "agent" && message.run_id ? [message.run_id] : [])}><div className={`agent-native-page ${activeConversation ? "has-conversation" : "is-empty"}`}>
      <header className="agent-native-routebar">
        <AgentHistoryMenu>
          <summary aria-label="Open Agent conversation history"><History aria-hidden="true" /><span>{activeConversation?.title ?? "New conversation"}</span><ChevronDown aria-hidden="true" /></summary>
          <div className="agent-history-popover floating-panel">
            <div className="agent-history-popover-head"><strong>Conversations</strong><AgentConversationLink href="/agent" newConversation><Plus aria-hidden="true" />New</AgentConversationLink></div>
            <div className="agent-history-list">
              {conversations.length ? conversations.map((conversation) => {
                const active = conversation.id === activeConversation?.id;
                const focus = conversation.opportunity_id ? opportunityMap.get(conversation.opportunity_id) : null;
                const subtitle = focus?.jobs ? `${focus.jobs.company} · ${focus.jobs.title}` : conversation.scope_mode === "workspace" ? projectMap.get(conversation.project_id)?.name ?? "Workspace" : "All workspaces";
                return <div className={`agent-history-row ${active ? "active" : ""}`} key={conversation.id}>
                  <AgentConversationLink href={`/agent?conversation=${conversation.id}`} aria-current={active ? "page" : undefined}><span><span className="agent-history-title">{conversation.title}</span><AgentActivityIndicator conversationId={conversation.id} /></span><small className="agent-history-meta"><span>{subtitle}</span><span aria-hidden="true">·</span><time dateTime={conversation.updated_at} title={new Date(conversation.updated_at).toUTCString()}>{formatConversationAge(conversation.updated_at)}</time></small></AgentConversationLink>
                  <form action={archiveAgentConversation}><input type="hidden" name="conversationId" value={conversation.id} /><button aria-label={`Archive ${conversation.title}`} data-tooltip="Archive conversation"><Archive aria-hidden="true" /></button></form>
                </div>;
              }) : <p className="agent-history-empty">No conversations yet.</p>}
            </div>
          </div>
        </AgentHistoryMenu>
        <span className="agent-native-scope"><Route aria-hidden="true" />{scopeLabel}{contextPage !== "agent" ? ` · ${agentContextPages[contextPage]}` : ""}</span>
        <AgentConversationLink className="agent-new-chat" href="/agent" newConversation><Plus aria-hidden="true" /><span>New conversation</span></AgentConversationLink>
      </header>

      {query.proposal && proposals.some(proposal => proposal.id === query.proposal && proposal.status === "applied") ? <SavedResultFocus proposalId={query.proposal} /> : null}
      {query.error ? <AgentNotice key={query.error} variant="error"><X aria-hidden="true" /><span>{query.error}</span></AgentNotice> : null}
      {query.decision === "applied" ? <AgentNotice key={`${query.decision}:${query.proposal}`} variant="success"><Check aria-hidden="true" /><span>Saved successfully. You can open the result below.</span></AgentNotice> : null}
      {query.decision === "unchanged" ? <AgentNotice key={`${query.decision}:${query.proposal}`}><Circle aria-hidden="true" /><span>No change applied. If the proposal expired, ask Agent for a fresh proposal using your current records.</span></AgentNotice> : null}
      {query.decision === "rejected" ? <AgentNotice key={`${query.decision}:${query.proposal}`}><Circle aria-hidden="true" /><span>Proposal rejected. No Roleway record changed.</span></AgentNotice> : null}

      <main className="agent-native-workplane">
        <AgentTranscript hasConversation={Boolean(activeConversation)} emptyState={<div className="agent-empty-state">
          <div className="agent-waypoint-watermark" aria-hidden="true"><Navigation /></div>
          <div className="agent-empty-copy"><h1>{focusedWorkspaceId ? `Ask about ${scopeLabel}.` : "Ask across your search."}</h1><p>{focusedWorkspaceId ? "Agent reads context from this Workspace and your Career Profile." : "Agent can read context from all of your Workspaces."} It answers questions, prepares drafts, and proposes Workspace-specific changes for your approval.</p></div>
          <p className="agent-prompt-examples">Use + or / below to create work or explore your search.</p>
        </div>}>
          {messages.map((message) => {
            const run = message.run_id ? runs.find((item) => item.id === message.run_id) : null;
            const runSteps = message.run_id ? steps.filter((step) => step.run_id === message.run_id) : [];
            const runProposals = message.run_id ? proposals.filter((proposal) => proposal.run_id === message.run_id) : [];
            return (
              <AgentPersistedMessage runId={message.run_id} key={message.id}><article className={`agent-message ${message.role}`} aria-label={message.role === "user" ? "Your message" : "Agent response"} key={message.id}>
                {run && message.role === "agent" ? <AgentRunDetails run={run} steps={runSteps} endedAt={message.created_at} /> : null}
                <div className="agent-message-body">
                <div className="agent-message-content">{message.role === "agent" ? <AgentMarkdown content={message.content} idPrefix={message.id} /> : <p>{message.content}</p>}</div>
                </div>
                {(message.role === "agent" ? runProposals : []).map((proposal) => <ApprovalCard createdWorkspaceId={query.proposal === proposal.id && proposal.status === "applied" && projectMap.has(query.record ?? "") ? query.record : undefined} workspace={proposal.destination_project_id ? projectMap.get(proposal.destination_project_id)?.name ?? "Unavailable Workspace" : undefined} proposal={proposal} opportunity={proposal.target_id ? opportunityMap.get(proposal.target_id) : undefined} key={proposal.id} />)}
                <MessageActions content={message.content} timestamp={message.created_at} />
                {run && (message.role === "user" && ["failed", "queued", "gathering_context", "generating"].includes(run.status)) ? <AgentRunDetails run={run} steps={runSteps} /> : null}
              </article></AgentPersistedMessage>
            );
          })}
        </AgentTranscript>

        <AgentComposer
          key={activeConversation?.id ?? query.new ?? "new"}
          conversationId={activeConversation?.id ?? ""}
          connections={readyConnections}
          opportunities={opportunities}
          focusedOpportunityId={focusedOpportunityId}
          projects={projectMap}
          workspaceId={focusedWorkspaceId}
          contextPage={contextPage}
          draftKey={query.draft}
        />
      </main>
    </div></AgentLiveProvider>
  );
}

function AgentComposer({ conversationId, connections, opportunities, focusedOpportunityId, projects, workspaceId, contextPage, draftKey }: { workspaceId: string; contextPage: AgentContextPage; draftKey?: string | undefined; conversationId: string; connections: Connection[]; opportunities: Opportunity[]; focusedOpportunityId: string; projects: Map<string, { name: string; ticketKey: string }> }) {
  if (!connections.length) return <section className="agent-native-composer agent-composer-disabled" aria-label="Connect an AI provider to use Agent"><label className="sr-only" htmlFor="disabled-agent-message">Message Roleway Agent</label><textarea id="disabled-agent-message" disabled placeholder="Connect a provider to ask Agent…" /><footer><span className="agent-context-disclosure"><KeyRound aria-hidden="true" />Your API key is encrypted before storage</span><Link className="agent-setup-link" href="/settings/ai">Set up connection</Link></footer></section>;
  return <AgentStreamForm action={sendAgentMessage} conversationId={conversationId}>
    <AgentMessageInput key={`${conversationId}:${workspaceId}:${contextPage}`} workspaceId={workspaceId} contextPage={contextPage} draftKey={draftKey} workspaces={Array.from(projects, ([id, project]) => ({ id, label: project.name }))} connections={connections} focusedOpportunityId={focusedOpportunityId} fixedFocus={Boolean(conversationId)} opportunities={opportunities.map(opportunity => ({
      id: opportunity.id,
      workspaceId: opportunity.project_id,
      label: `${projects.get(opportunity.project_id)?.name ?? "Workspace"} · ${formatOpportunityTicket(projects.get(opportunity.project_id)?.ticketKey ?? "RW", opportunity.reference_number)} · ${opportunity.jobs?.company} · ${opportunity.jobs?.title}`,
    }))} />
  </AgentStreamForm>;
}

function AgentRunDetails({ run, steps, endedAt }: { run: Run; steps: Step[]; endedAt?: string }) {
  const active = ["queued", "gathering_context", "generating"].includes(run.status);
  const stale = active && Date.now() - Date.parse(run.created_at) >= 300_000;
  const visibleSteps = steps.some(step => step.position >= 10) ? steps.filter(step => step.position >= 10 || step.status === "failed") : steps;
  return <RunTimeline recovering={active} pending={active && !stale} statusUnknown={stale} startedAt={run.created_at} endedAt={endedAt ?? steps.find(step => step.status === "failed")?.created_at}
    failed={run.status === "failed"} awaitingApproval={run.status === "awaiting_approval"}
    steps={visibleSteps.map(step => ({ id: step.id, label: step.label, status: step.status === "pending" ? "active" : step.status }))}
    model={{ provider: run.provider, name: run.model, inputTokens: run.input_tokens, outputTokens: run.output_tokens }} />;
}

function ApprovalCard({ proposal, opportunity, workspace, createdWorkspaceId }: { createdWorkspaceId: string | undefined; proposal: Proposal; opportunity: Opportunity | undefined; workspace: string | undefined }) {
  const feedback = creationFeedback[proposal.tool_name];
  const details = proposalDetails(proposal, opportunity);
  const resultTitle = proposal.tool_name === "create_workspace" ? proposal.arguments.name
    : proposal.tool_name === "create_task" || proposal.tool_name === "set_next_action" ? proposal.arguments.title : null;
  const savedTitle = proposal.status === "applied" ? String(resultTitle ?? toolLabel(proposal.tool_name)) : toolLabel(proposal.tool_name);
  if (proposal.status === "applied" && ["create_workspace", "create_task", "set_next_action"].includes(proposal.tool_name)) {
    const titleIndex = details.findIndex(([label]) => ["Workspace", "Task", "Next Action"].includes(label));
    if (titleIndex >= 0) details.splice(titleIndex, 1);
  }
  if (workspace) details.unshift(["Workspace", workspace]);
  return <section id={`proposal-${proposal.id}`} className={`agent-approval-card ${proposal.status}`} aria-label="Agent proposed change">
    <header><strong className="agent-result-title">{proposal.status === "applied" ? <Check aria-hidden="true" /> : <Navigation aria-hidden="true" />}{savedTitle}</strong><span>{proposal.status === "proposed" ? "Approval required" : proposal.status === "applied" ? "Saved" : "Proposal"}</span></header>
    <p>{proposal.summary}</p>
    <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {proposal.status === "proposed" ? <footer>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="reject" /><SubmitButton className="button ghost" pendingLabel="Rejecting…">Reject</SubmitButton></form>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="approve" /><SubmitButton pendingLabel={feedback?.pending ?? "Saving…"}>Approve change</SubmitButton></form>
    </footer> : <div className="agent-approval-outcome" tabIndex={-1}><span className={`agent-proposal-status ${proposal.status}`}><Check aria-hidden="true" />{proposal.status === "applied" ? feedback?.success ?? "Saved" : proposal.status === "rejected" ? "Rejected" : proposal.status === "failed" ? "Could not apply" : proposal.status === "superseded" ? "Replaced by a revised proposal" : proposal.status}</span>{proposal.status === "applied" ? proposal.tool_name === "create_workspace" ? <Link className="button primary" href={createdWorkspaceId ? `/settings/workspaces/${createdWorkspaceId}` : "/settings/workspaces"}>{createdWorkspaceId ? "Open Workspace" : "View Workspaces"}<ArrowUpRight aria-hidden="true" /></Link> : <form action={openAgentResult}><input type="hidden" name="proposalId" value={proposal.id} /><SubmitButton pendingLabel="Opening…">{feedback?.open ?? "Open Opportunity"}</SubmitButton></form> : null}</div>}
  </section>;
}

function proposalDetails(proposal: Proposal, opportunity?: Opportunity): Array<[string, string]> {
  const args = proposal.arguments;
  const interview = agentInterviewSchema.safeParse(args.interview);
  const contact = agentContactSchema.safeParse(args.contact);
  const target = opportunity?.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : "Unavailable Opportunity";
  if (proposal.tool_name === "create_interview" && interview.success) {
    const value = interview.data;
    return [["Opportunity", target], ["Interview", value.interviewType], ["Starts", new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: value.timezone }).format(new Date(value.startsAt))], ["Timezone", value.timezone], ["Duration", `${value.durationMinutes} minutes`], ["Meeting URL", value.meetingUrl ?? "Not provided"], ["Interviewers", value.interviewers ?? "Not provided"], ["Also saves", "Preparation task; eligible Opportunity moves to Interview. No calendar invite is sent."]];
  }
  if (proposal.tool_name === "create_contact" && contact.success) {
    const value = contact.data;
    return [["Opportunity", proposal.target_id ? target : "Workspace contact"], ["Name", value.name], ["Relationship", value.relationship.replaceAll("_", " ")], ["Role", value.role ?? "Not provided"], ["Company", value.company ?? "Not provided"], ["Email", value.email ?? "Not provided"], ["Phone", value.phone ?? "Not provided"], ["Profile URL", value.profileUrl ?? "Not provided"], ["Notes", value.notes ?? "None"], ["Follow-up", value.followUpAt ? new Date(value.followUpAt).toISOString() : "No follow-up date"]];
  }
  if (proposal.tool_name === "create_workspace") return [["Workspace", String(args.name ?? "Untitled")], ["Objective", String(args.objective ?? "Focused job search")]];
  if (proposal.tool_name === "create_task") return [["Opportunity", target], ["Task", String(args.title ?? "Untitled")], ["Due", args.dueAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(args.dueAt))) : "No due date"]];
  if (proposal.tool_name === "set_next_action") return [["Opportunity", target], ["Next Action", String(args.title ?? "Untitled")], ["Due", args.dueAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(args.dueAt))) : "No due date"]];
  return [["Opportunity", target], ["Note", String(args.body ?? "")]];
}

function toolLabel(tool: string) {
  return ({ create_workspace: "Create Workspace", create_task: "Create task", set_next_action: "Update Next Action", create_note: "Add note", create_interview: "Create interview", create_contact: "Create contact" } as Record<string, string>)[tool] ?? "Change Roleway record";
}

const creationFeedback: Record<string, { pending: string; success: string; open: string }> = {
  create_interview: { pending: "Creating interview…", success: "Interview created", open: "Open interview" },
  create_contact: { pending: "Creating contact…", success: "Contact created", open: "Open contact" },
  create_workspace: { pending: "Creating Workspace…", success: "Workspace created", open: "Open Workspace" },
  create_task: { pending: "Creating task…", success: "Task created", open: "Open task" },
  create_note: { pending: "Creating note…", success: "Note created", open: "Open note" },
  set_next_action: { pending: "Setting Next Action…", success: "Next Action saved", open: "Open Next Action" },
};
