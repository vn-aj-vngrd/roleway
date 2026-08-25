"use client";

import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, FileText, Inbox, LayoutDashboard, LockKeyhole, NotebookPen, Target } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const highlights = [
  { key: "today", label: "Today", title: "See the next move before the noise.", copy: "Due work, interviews, follow-ups, and jobs waiting for review arrive in one ordered view.", tone: "blue", size: "wide" },
  { key: "inbox", label: "Job inbox", title: "Review first. Commit later.", copy: "Keep promising listings separate until they deserve a place in your active search.", tone: "paper", size: "standard" },
  { key: "pipeline", label: "Pipeline", title: "Every serious role has a visible stage.", copy: "See where opportunities stand and what should happen next.", tone: "mist", size: "wide" },
  { key: "workspace", label: "Opportunity", title: "The whole application stays together.", copy: "Role details, tasks, notes, and history share one durable record.", tone: "paper", size: "wide" },
  { key: "interviews", label: "Interviews", title: "Every conversation stays attached.", copy: "Schedule the interview against the right opportunity and open its context in one move.", tone: "blue", size: "standard" },
  { key: "documents", label: "Documents", title: "Every file remembers what it is for.", copy: "Resumes, answers, messages, and notes keep a clear status and opportunity.", tone: "mist", size: "standard" },
  { key: "assist", label: "Assist", title: "Grounded preparation. Never autopilot.", copy: "Review suggestions from context you choose. Nothing is sent or applied for you.", tone: "paper", size: "wide" },
  { key: "insights", label: "Insights", title: "No conclusions from thin evidence.", copy: "Roleway waits for enough recorded activity before showing conversion rates.", tone: "blue", size: "standard" },
  { key: "control", label: "Notifications & privacy", title: "Quiet updates. Private workspace.", copy: "Meaningful changes stay visible while records and external actions remain under your control.", tone: "mist", size: "wide" },
] as const;

type HighlightKey = (typeof highlights)[number]["key"];

export function LandingHighlights() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);

  const syncControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanGoBack(track.scrollLeft > 8);
    setCanGoForward(track.scrollLeft < track.scrollWidth - track.clientWidth - 8);
  }, []);

  const move = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(320, track.clientWidth * 0.72), behavior: "smooth" });
  }, []);

  return (
    <section className="rw-highlights" data-reveal aria-labelledby="highlights-title">
      <header>
        <h2 id="highlights-title">Get the highlights.</h2>
        <div className="rw-highlight-controls" aria-label="Highlight controls">
          <button type="button" onClick={() => move(-1)} disabled={!canGoBack} aria-label="Previous highlights"><ArrowLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => move(1)} disabled={!canGoForward} aria-label="Next highlights"><ArrowRight aria-hidden="true" /></button>
        </div>
      </header>
      <div className="rw-highlight-track" ref={trackRef} onScroll={syncControls} tabIndex={0} aria-label="Roleway feature highlights">
        {highlights.map((highlight) => (
          <article className={`rw-highlight-card feature-${highlight.key} tone-${highlight.tone} size-${highlight.size}`} key={highlight.key}>
            <div className="rw-highlight-copy"><span>{highlight.label}</span><h3>{highlight.title}</h3><p>{highlight.copy}</p></div>
            <HighlightArtwork feature={highlight.key} />
          </article>
        ))}
      </div>
    </section>
  );
}

function HighlightArtwork({ feature }: { feature: HighlightKey }) {
  if (feature === "today") return <div className="rw-feature-art art-today"><div className="art-today-summary"><LayoutDashboard /><span>Needs attention</span><strong>3</strong></div>{[["10:00", "System design interview", "Northstar Systems"], ["Today", "Send application follow-up", "Fieldwork"], ["Inbox", "Review two saved jobs", "Waiting for review"]].map(([time, item, meta]) => <div className="art-focus-row" key={item}><time>{time}</time><i /><span><strong>{item}</strong><small>{meta}</small></span><ArrowRight /></div>)}</div>;

  if (feature === "inbox") return <div className="rw-feature-art art-inbox"><div className="art-job-tag"><Inbox />New</div><small>Northstar Systems · Company site</small><h4>Senior Product Engineer</h4><p>$165k–$190k · Remote — US</p><blockquote>Build dependable product workflows with TypeScript, React, and PostgreSQL.</blockquote><div><button tabIndex={-1}>Track opportunity</button><button tabIndex={-1}>Maybe</button><button tabIndex={-1}>Dismiss</button></div></div>;

  if (feature === "pipeline") return <div className="rw-feature-art art-pipeline">{[["Interested", "Northstar Systems", "Review role evidence"], ["Preparing", "Atlas Labs", "Choose project examples"], ["Applied", "Fieldwork", "Follow up Friday"]].map(([stage, company, action], index) => <div className="art-stage" key={stage} style={{ "--stage": index } as React.CSSProperties}><header><i /><span>{stage}</span></header><article><small>{company}</small><h4>Product Engineer</h4><p><Target />{action}</p><footer>RLW-0{14 + index}</footer></article></div>)}</div>;

  if (feature === "workspace") return <div className="rw-feature-art art-workspace"><div className="art-task-stack"><span>Tasks</span><p><i className="done" /><strong>Review platform requirements</strong></p><p><i /><strong>Choose two project examples</strong></p><p><i /><strong>Draft application notes</strong></p></div><aside><small>Next action</small><Target /><strong>Choose two project examples</strong><span>Due Friday</span><button tabIndex={-1}>Save next action</button><footer>1 of 3 tasks complete</footer></aside></div>;

  if (feature === "interviews") return <div className="rw-feature-art art-interview"><div className="art-date"><span>Tomorrow</span><strong>10:00</strong></div><CalendarDays /><div><small>Northstar Systems</small><h4>System design</h4><p>Senior Product Engineer</p></div><span className="art-duration">60 min</span><button tabIndex={-1}>Open opportunity <ArrowRight /></button></div>;

  if (feature === "documents") return <div className="rw-feature-art art-documents">{[["Targeted resume", "resume", "draft"], ["Project examples", "research note", "ready"], ["Application answers", "answer", "draft"]].map(([name, type, status], index) => <div key={name} style={{ "--document": index } as React.CSSProperties}><FileText /><span><strong>{name}</strong><small>{type}</small></span><em>{status}</em><ArrowRight /></div>)}</div>;

  if (feature === "assist") return <div className="rw-feature-art art-assist"><div className="art-context"><NotebookPen /><span><strong>Northstar Systems</strong><small>Listing, profile, tasks, and recent notes selected</small></span></div><article><small>Reviewable suggestion</small><h4>Choose two architecture trade-offs</h4><p>Connect each choice to evidence in a saved project example.</p><button tabIndex={-1}>Use as next action</button></article><footer><LockKeyhole />You start every run. Nothing is sent in the background.</footer></div>;

  if (feature === "insights") return <div className="rw-feature-art art-insights"><div className="art-insight-icon"><Target /></div><strong>More activity is needed</strong><p>Roleway waits for at least three recorded applications before showing conversion rates.</p><div><span>Applications recorded</span><i><b /></i></div><small>Based only on your actual Roleway activity</small></div>;

  return <div className="rw-feature-art art-control"><div className="art-private"><LockKeyhole /><span><strong>Private workspace</strong><small>Owner-scoped records</small></span></div><div className="art-notification"><Bell /><span><strong>Interview moved to Friday</strong><small>Northstar Systems · Just now</small></span><button tabIndex={-1}>Open</button></div><div className="art-notification"><Check /><span><strong>Application marked submitted</strong><small>Fieldwork · Today</small></span></div><footer>You approve every external action.</footer></div>;
}
