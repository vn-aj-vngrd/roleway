import { formatOpportunityTicket } from "@roleway/core";
import { Archive, Check, ChevronDown, Circle, History, KeyRound, Navigation, Plus, Route, Send, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveAgentConversation, decideAgentProposal, sendAgentMessage } from "./actions";

type Connection = { id: string; label: string; provider: string; model: string; status: string };
type Opportunity = { id: string; project_id: string; reference_number: number; next_action: string | null; jobs: { company: string; title: string } | null };
type Conversation = { id: string; project_id: string; title: string; opportunity_id: string | null; updated_at: string };
type Message = { id: string; role: "user" | "agent"; content: string; run_id: string | null; created_at: string };
type Run = { id: string; provider: string; model: string; status: string; input_tokens: number | null; output_tokens: number | null; created_at: string };
type Step = { id: string; run_id: string; label: string; status: "pending" | "active" | "completed" | "failed"; position: number };
type Proposal = { id: string; run_id: string; tool_name: string; target_id: string | null; summary: string; arguments: Record<string, unknown>; status: string; created_at: string };

type AgentQuery = { conversation?: string; opportunity?: string; error?: string; decision?: string };

export default async function AgentPage(props: { searchParams: Promise<AgentQuery> }) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const admin = createAdminClient();
  const [connectionsResult, opportunitiesResult, conversationsResult] = await Promise.all([
    admin.from("ai_connections").select("id, label, provider, model, status").eq("user_id", context.user.id).order("updated_at", { ascending: false }),
    context.supabase.from("opportunities").select("id, project_id, reference_number, next_action, jobs(company, title)").eq("user_id", context.user.id).neq("stage", "closed").order("updated_at", { ascending: false }),
    context.supabase.from("agent_conversations").select("id, project_id, title, opportunity_id, updated_at").eq("user_id", context.user.id).eq("status", "active").order("updated_at", { ascending: false }).limit(40),
  ]);
  const connections = (connectionsResult.data ?? []) as Connection[];
  const readyConnections = connections.filter((connection) => connection.status === "connected");
  const opportunities = (opportunitiesResult.data ?? []) as unknown as Opportunity[];
  const conversations = (conversationsResult.data ?? []) as Conversation[];
  const activeConversation = query.conversation ? conversations.find((conversation) => conversation.id === query.conversation) ?? null : null;
  if (query.conversation && !activeConversation) redirect("/agent?error=That%20conversation%20is%20not%20available.");

  let messages: Message[] = [];
  let runs: Run[] = [];
  let steps: Step[] = [];
  let proposals: Proposal[] = [];
  if (activeConversation) {
    const [messagesResult, runsResult, stepsResult, proposalsResult] = await Promise.all([
      context.supabase.from("agent_messages").select("id, role, content, run_id, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true }).limit(200),
      context.supabase.from("ai_runs").select("id, provider, model, status, input_tokens, output_tokens, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true }).limit(100),
      context.supabase.from("agent_run_steps").select("id, run_id, label, status, position").eq("conversation_id", activeConversation.id).order("position", { ascending: true }).limit(300),
      context.supabase.from("agent_proposals").select("id, run_id, tool_name, target_id, summary, arguments, status, created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true }).limit(100),
    ]);
    messages = (messagesResult.data ?? []) as Message[];
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
        <span className="agent-native-scope"><Route aria-hidden="true" />All workspaces</span>
        <Link className="agent-new-chat" href="/agent"><Plus aria-hidden="true" /><span>New conversation</span></Link>
      </header>

      {query.error ? <div className="agent-inline-state error" role="alert"><X aria-hidden="true" /><span>{query.error}</span></div> : null}
      {query.decision === "applied" ? <div className="agent-inline-state success" role="status"><Check aria-hidden="true" /><span>Approved change applied. The originating record is up to date.</span></div> : null}
      {query.decision === "rejected" ? <div className="agent-inline-state" role="status"><Circle aria-hidden="true" /><span>Proposal rejected. No Roleway record changed.</span></div> : null}

      <main className="agent-native-workplane">
        {activeConversation ? <div className="agent-transcript" aria-label="Agent conversation">
          {messages.map((message) => {
            const run = message.run_id ? runs.find((item) => item.id === message.run_id) : null;
            const runSteps = message.run_id ? steps.filter((step) => step.run_id === message.run_id) : [];
            const runProposals = message.run_id ? proposals.filter((proposal) => proposal.run_id === message.run_id) : [];
            return (
              <article className={`agent-message ${message.role}`} key={message.id}>
                <header><span className="agent-message-author">{message.role === "agent" ? <><Navigation aria-hidden="true" />Roleway Agent</> : "You"}</span><time dateTime={message.created_at}>{messageTime(message.created_at)}</time></header>
                <div className="agent-message-content">{message.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                {message.role === "agent" && run ? <AgentRunDetails run={run} steps={runSteps} /> : null}
                {runProposals.map((proposal) => <ApprovalCard proposal={proposal} opportunity={proposal.target_id ? opportunityMap.get(proposal.target_id) : undefined} key={proposal.id} />)}
              </article>
            );
          })}
        </div> : <div className="agent-empty-state">
          <div className="agent-waypoint-watermark" aria-hidden="true"><Navigation /></div>
          <div className="agent-empty-copy"><h1>Ask across your search.</h1><p>Agent can read context from all of your Workspaces. It answers questions, prepares drafts, and proposes Workspace-specific changes for your approval.</p></div>
          <div className="agent-prompt-examples" aria-label="Example questions"><span>What needs attention today?</span><span>Prepare me for my next interview.</span><span>Create a follow-up task for Friday.</span></div>
        </div>}

        <AgentComposer
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

function AgentComposer({ conversationId, connections, opportunities, focusedOpportunityId, projects }: { conversationId: string; connections: Connection[]; opportunities: Opportunity[]; focusedOpportunityId: string; projects: Map<string, { name: string; ticketKey: string }> }) {
  if (!connections.length) return <section className="agent-native-composer agent-composer-disabled" aria-label="Connect an AI provider to use Agent"><label className="sr-only" htmlFor="disabled-agent-message">Message Roleway Agent</label><textarea id="disabled-agent-message" disabled placeholder="Connect a provider to ask Agent…" /><footer><span className="agent-context-disclosure"><KeyRound aria-hidden="true" />Your API key is encrypted before storage</span><Link className="agent-setup-link" href="/settings/ai">Set up connection</Link></footer></section>;
  return <form action={sendAgentMessage} className="agent-native-composer">
    <input type="hidden" name="conversationId" value={conversationId} />
    <label className="sr-only" htmlFor="agent-message">Message Roleway Agent</label>
    <textarea id="agent-message" name="message" maxLength={4000} required placeholder="Ask across your workspaces…" autoFocus={!conversationId} />
    <footer>
      <div className="agent-composer-context">
        <label><span>Provider</span><select name="connectionId" aria-label="Agent provider" defaultValue={connections[0]?.id}>{connections.map((connection) => <option value={connection.id} key={connection.id}>{connection.label} · {connection.model}</option>)}</select></label>
        <label><span>Focus</span><select name="opportunityId" aria-label="Agent Opportunity focus" defaultValue={focusedOpportunityId} disabled={Boolean(conversationId)}><option value="">All workspaces</option>{opportunities.map((opportunity) => <option value={opportunity.id} key={opportunity.id}>{projects.get(opportunity.project_id)?.name ?? "Workspace"} · {formatOpportunityTicket(projects.get(opportunity.project_id)?.ticketKey ?? "RW", opportunity.reference_number)} · {opportunity.jobs?.company} · {opportunity.jobs?.title}</option>)}</select></label>
      </div>
      <span className="agent-context-disclosure"><Route aria-hidden="true" />Career Profile and all Workspace context</span>
      <SubmitButton className="agent-send" pendingLabel="Working…"><Send aria-hidden="true" /><span className="sr-only">Send to Agent</span></SubmitButton>
    </footer>
  </form>;
}

function AgentRunDetails({ run, steps }: { run: Run; steps: Step[] }) {
  return <details className="agent-run-details">
    <summary><span className={`agent-run-state ${run.status}`}><Check aria-hidden="true" /></span><span>{run.status === "awaiting_approval" ? "Answer ready · approval requested" : run.status === "failed" ? "Run failed safely" : "Context and model details"}</span><ChevronDown aria-hidden="true" /></summary>
    <div>{steps.map((step) => <p className={`agent-step ${step.status}`} key={step.id}><span>{step.status === "completed" ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}</span>{step.label}</p>)}<p className="agent-run-model">{run.provider} · {run.model}{run.input_tokens || run.output_tokens ? ` · ${run.input_tokens ?? 0} in / ${run.output_tokens ?? 0} out` : ""}</p></div>
  </details>;
}

function ApprovalCard({ proposal, opportunity }: { proposal: Proposal; opportunity: Opportunity | undefined }) {
  const details = proposalDetails(proposal, opportunity);
  return <section className={`agent-approval-card ${proposal.status}`} aria-label="Agent proposed change">
    <header><span><Navigation aria-hidden="true" />Approval required</span><strong>{toolLabel(proposal.tool_name)}</strong></header>
    <p>{proposal.summary}</p>
    <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {proposal.status === "proposed" ? <footer>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="reject" /><SubmitButton className="button ghost" pendingLabel="Rejecting…">Reject</SubmitButton></form>
      <form action={decideAgentProposal}><input type="hidden" name="proposalId" value={proposal.id} /><input type="hidden" name="decision" value="approve" /><SubmitButton pendingLabel="Applying…">Approve change</SubmitButton></form>
    </footer> : <div className="agent-approval-outcome"><span className={`agent-proposal-status ${proposal.status}`}><Check aria-hidden="true" />{proposal.status === "applied" ? "Applied" : proposal.status === "rejected" ? "Rejected" : proposal.status === "failed" ? "Could not apply" : proposal.status}</span></div>}
  </section>;
}

function proposalDetails(proposal: Proposal, opportunity?: Opportunity): Array<[string, string]> {
  const args = proposal.arguments;
  const target = opportunity?.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : "Current account";
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

function messageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
