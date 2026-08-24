"use client";

import { ArrowRight, Check, FileText, Search, Target } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/logo";

const features = [
  { key: "today", label: "Today", title: "Begin with the work that needs attention.", copy: "Due tasks, follow-ups, interviews, and jobs waiting for review appear in one ordered view." },
  { key: "inbox", label: "Job inbox", title: "Review a job before it becomes a commitment.", copy: "Keep the source listing, pay, location, and requirements together while you decide whether it deserves time." },
  { key: "pipeline", label: "Pipeline", title: "See every serious opportunity and its next move.", copy: "Seven stages show where work stands. Every active opportunity can carry one concrete next action and due date." },
  { key: "workspace", label: "Opportunity", title: "One durable record for the whole application.", copy: "Tasks, notes, contacts, documents, interviews, preparation, and history stay with the role they belong to." },
  { key: "documents", label: "Documents", title: "Application material stays connected to context.", copy: "Keep resumes, cover letters, answers, and research beside the opportunity instead of across scattered folders." },
  { key: "interviews", label: "Interviews", title: "Walk into every conversation with the context intact.", copy: "Schedule interviews, keep preparation tasks, and open the right notes without reconstructing the application." },
  { key: "insights", label: "Insights", title: "Learn from the activity you actually record.", copy: "Review stage movement and conversion without turning a selective search into a volume contest." },
  { key: "assist", label: "Assist", title: "Prepare a grounded draft, then decide what to use.", copy: "Bring your own supported provider. Roleway uses the opportunity context you choose and never applies or contacts anyone for you." },
] as const;

type FeatureKey = (typeof features)[number]["key"];

export function LandingFeatureExplorer() {
  const [active, setActive] = useState<FeatureKey>("today");
  const selected = features.find((feature) => feature.key === active) ?? features[0];

  return (
    <div className="landing-explorer">
      <div className="landing-explorer-tabs" role="tablist" aria-label="Roleway features">
        {features.map((feature) => (
          <button key={feature.key} role="tab" aria-selected={active === feature.key} onClick={() => setActive(feature.key)}>
            {feature.label}
          </button>
        ))}
      </div>
      <div className="landing-explorer-body" role="tabpanel">
        <div className="landing-explorer-copy">
          <h3>{selected.title}</h3>
          <p>{selected.copy}</p>
          <a href="#workflow">See the connected workflow <ArrowRight aria-hidden="true" /></a>
        </div>
        <FeatureWindow active={active} />
      </div>
    </div>
  );
}

function FeatureWindow({ active }: { active: FeatureKey }) {
  return (
    <div className="feature-window" aria-hidden="true" inert>
      <aside className="feature-window-sidebar">
        <span><LogoMark size={18} /><b>Roleway</b></span>
        <nav><i /><i className="active" /><i /><i /><i /></nav>
        <em />
      </aside>
      <div className="feature-window-main">
        <header><span className="preview-panel-icon" /><i /><span>Workspace</span><b>/</b><strong>{features.find((feature) => feature.key === active)?.label}</strong><kbd>⌘ K</kbd></header>
        {active === "today" ? <TodayView /> : active === "inbox" ? <InboxView /> : active === "pipeline" ? <PipelineView /> : active === "workspace" ? <WorkspaceView /> : active === "documents" ? <DocumentsView /> : active === "interviews" ? <InterviewsView /> : active === "insights" ? <InsightsView /> : <AssistView />}
      </div>
    </div>
  );
}

function TodayView() {
  const rows = [
    ["10:00", "System design interview", "Northstar Systems · 60 minutes", "Prepare"],
    ["Today", "Send application follow-up", "Fieldwork · Applied 6 days ago", "Open"],
    ["Inbox", "Review two saved jobs", "Decide what enters the pipeline", "Review"],
  ];
  return <div className="feature-today"><div className="feature-view-heading"><span>Thursday, August 20</span><h4>Good morning, Jordan</h4><p>Three items need your attention.</p></div>{rows.map(([time, title, meta, action]) => <div className="feature-focus-row" key={title}><time>{time}</time><i /><div><strong>{title}</strong><span>{meta}</span></div><button>{action}</button></div>)}</div>;
}

function InboxView() {
  return <div className="feature-inbox"><aside><div className="feature-view-heading"><span>2 jobs to review</span><h4>Job inbox</h4></div><button className="active"><strong>Senior Product Engineer</strong><span>Northstar Systems · Company site</span></button><button><strong>Product Engineer</strong><span>Fieldwork · Referral</span></button></aside><main><span>Northstar Systems</span><h4>Senior Product Engineer</h4><p>Remote · $165k–$190k · TypeScript, React, PostgreSQL</p><div className="feature-requirements"><b>Requirements</b><span><Check />Product engineering experience <em>Evidence saved</em></span><span><Check />TypeScript and React <em>Strong match</em></span><span><Search />Workforce planning domain <em>Review</em></span></div><footer><button>Add to pipeline</button><button>Maybe</button><button>Dismiss</button></footer></main></div>;
}

function PipelineView() {
  const columns = [
    ["Interested", ["Senior Product Engineer", "Product Engineer"]],
    ["Preparing", ["Staff Engineer"]],
    ["Applied", ["Platform Engineer"]],
    ["Interview", ["Product Lead"]],
  ] as const;
  return <div className="feature-pipeline">{columns.map(([stage, roles]) => <section key={stage}><header><strong>{stage}</strong><span>{roles.length}</span></header>{roles.map((role, index) => <article key={role}><small>{index ? "Fieldwork" : stage === "Interested" ? "Northstar" : stage === "Preparing" ? "Meridian" : stage === "Applied" ? "Arcway" : "Lattice"}</small><h4>{role}</h4><p><i />{stage === "Interview" ? "Prepare role stories" : stage === "Applied" ? "Follow up Friday" : "Review requirements"}</p><time>{stage === "Interview" ? "Tomorrow" : "This week"}</time></article>)}</section>)}</div>;
}

function WorkspaceView() {
  return <div className="feature-workspace"><main><div className="feature-view-heading"><span>RLW-014 · Interested</span><h4>Senior Product Engineer · Northstar Systems</h4><p>Remote · $165k–$190k · Company site</p></div><nav><b>Overview</b><span>Tasks</span><span>Notes</span><span>Activity</span></nav><section><h5>Role details</h5><dl><div><dt>Source</dt><dd>Company site</dd></div><div><dt>Location</dt><dd>Remote — US</dd></div><div><dt>Compensation</dt><dd>$165k–$190k</dd></div></dl><h5>Tasks</h5><label><i />Review platform requirements</label><label><i />Choose two project examples</label></section></main><aside><span>Next action</span><strong>Review platform requirements</strong><small>Due Friday</small><button>Save next action</button><div><b>Progress</b><span>1 of 3 tasks complete</span></div></aside></div>;
}

function DocumentsView() {
  const docs = [["Targeted resume", "Resume", "Northstar Systems", "Updated today"], ["System design notes", "Interview prep", "Northstar Systems", "Updated yesterday"], ["Project examples", "Research", "Meridian", "4 examples"], ["Follow-up draft", "Application", "Fieldwork", "Needs review"]];
  return <div className="feature-documents"><div className="feature-view-heading"><span>Application material</span><h4>Documents</h4><p>Every file keeps the opportunity that gives it meaning.</p></div><div className="feature-document-head"><span>Name</span><span>Type</span><span>Opportunity</span><span>Updated</span></div>{docs.map(([name, type, company, updated]) => <div className="feature-document-row" key={name}><FileText /><strong>{name}</strong><span>{type}</span><span>{company}</span><time>{updated}</time></div>)}</div>;
}

function InterviewsView() {
  return <div className="feature-interviews"><div className="feature-view-heading"><span>This week</span><h4>Interviews</h4><p>Schedule and preparation in one view.</p></div><article><time>Tomorrow<br /><b>10:00</b></time><div><span>Northstar Systems</span><h5>System design interview</h5><p>60 minutes · Video call</p></div><aside><strong>2 of 3 ready</strong><span><Check /> Confirm format</span><span><Check /> Review domain</span><span>○ Prepare trade-offs</span></aside><button>Open prep</button></article><article><time>Friday<br /><b>14:30</b></time><div><span>Meridian</span><h5>Hiring manager conversation</h5><p>45 minutes · Video call</p></div><aside><strong>Preparation not started</strong><span>Role brief attached</span></aside><button>Prepare</button></article></div>;
}

function InsightsView() {
  const rows = [["Saved → tracked", "12", "7", "58%"], ["Tracked → applied", "7", "4", "57%"], ["Applied → interview", "4", "2", "50%"], ["Interview → offer", "2", "1", "50%"]];
  return <div className="feature-insights"><div className="feature-view-heading"><span>Activity you recorded</span><h4>Pipeline insights</h4><p>Understand movement without rewarding application volume.</p></div><div className="feature-insight-summary"><span><b>7</b> active opportunities</span><span><b>2</b> interviews</span><span><b>1</b> offer</span></div><div className="feature-conversion"><header><span>Transition</span><span>From</span><span>To</span><span>Rate</span></header>{rows.map(([label, from, to, rate]) => <div key={label}><strong>{label}</strong><span>{from}</span><span>{to}</span><span><i style={{ width: rate }} />{rate}</span></div>)}</div></div>;
}

function AssistView() {
  return <div className="feature-assist"><div className="feature-assist-context"><span>Opportunity</span><strong>Northstar Systems · Senior Product Engineer</strong><small>Listing, profile, preferences, tasks, and recent notes selected</small></div><main><span>Reviewable draft</span><h4>Prepare for the system design interview</h4><p>Focus on evidence already attached to this opportunity. Review and edit every suggestion before using it.</p><ol><li><b>Choose two architecture trade-offs</b><span>Connect each choice to a project example in your notes.</span><button>Use as next action</button></li><li><b>Prepare one clarifying question</b><span>Use the saved workforce-planning research as context.</span><button>Use as next action</button></li></ol></main><footer><Target />Nothing is sent until you run Assist. No external action is taken.</footer></div>;
}
