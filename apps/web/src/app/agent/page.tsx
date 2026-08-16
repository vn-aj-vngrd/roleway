import { CheckCircle2, Circle, Clock3, Send } from "lucide-react";

const steps = [
  { label: "Read opportunity", state: "done" },
  { label: "Read Career Profile", state: "done" },
  { label: "Parse requirements", state: "done" },
  { label: "Compare existing resume", state: "active" },
  { label: "Generate recommendations", state: "pending" },
  { label: "Create resume diff", state: "pending" },
  { label: "Propose tasks", state: "pending" },
];

export default function AgentPage() {
  return <div className="agent-layout"><section className="agent-conversation"><header className="page-header"><div><h1>Agent</h1><p className="page-subtitle">Context: RLW-024 · Product Engineer at Linear</p></div></header><div className="message user">Prepare this application. Focus on the experience they care about most.</div><div className="message agent"><strong>Preparing the application</strong><p>I’ll compare the role’s required evidence with your approved Full Stack resume, then propose a plan, a reviewable resume version, and only the tasks that move this application forward.</p><p className="muted small">This run sends the job description, selected resume, and relevant Career Profile evidence to Anthropic. Contacts, other applications, and private notes are excluded.</p></div><div className="agent-composer"><textarea aria-label="Message agent" placeholder="Ask about this opportunity…" /><div className="composer-foot"><span>RLW-024 context attached</span><div className="topbar-spacer" /><button className="icon-button" aria-label="Send"><Send /></button></div></div></section><aside className="agent-run" aria-label="Active agent run"><div className="run-title">APPLICATION PREP</div><div className="run-meta">Run #AR-108 · Claude Sonnet · 41s</div>{steps.map((step) => <div className={`run-step step-${step.state}`} key={step.label}>{step.state === "done" ? <CheckCircle2 /> : step.state === "active" ? <Clock3 /> : <Circle />}<span>{step.label}</span></div>)}<div className="approval"><h3>Approval will be required</h3><p className="page-subtitle">The agent plans to create 3 tasks, 1 resume version, and 1 application draft. Exact changes will appear here before anything is adopted.</p><div className="approval-actions"><button className="button secondary">Review changes</button><button className="button ghost" disabled>Approve</button></div></div></aside></div>;
}
