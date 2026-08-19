"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Check, Inbox, Target } from "lucide-react";
import { useRef, useState } from "react";

const features = [
  { key: "today", label: "Today", title: "Know what deserves attention", description: "See interviews, overdue tasks, follow-ups, and unreviewed jobs in one restrained daily queue—not a dashboard full of vanity metrics." },
  { key: "inbox", label: "Job inbox", title: "Review before you commit", description: "Capture a listing first. Track it as an Opportunity only after it clears your preferences and deserves preparation time." },
  { key: "workspace", label: "Opportunity", title: "Keep the whole story together", description: "The role, next action, tasks, notes, interviews, source listing, and activity history stay attached to one durable workspace." },
  { key: "control", label: "Control", title: "Your search stays yours", description: "Your workspace is private by default. Roleway keeps the workflow focused, and no external action is taken on your behalf." },
] as const;

export function MarketingFeatureShowcase() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const feature = features[active] ?? features[0];
  const move = (direction: -1 | 1) => setActive((value) => (value + direction + features.length) % features.length);

  return (
    <div className="marketing-showcase" role="region" aria-roledescription="carousel" aria-label="Roleway product capabilities" onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touchStart.current === null || end === undefined) return; const delta = end - touchStart.current; if (Math.abs(delta) > 48) move(delta > 0 ? -1 : 1); touchStart.current = null; }} tabIndex={0}>
      <div className="showcase-tabs" role="tablist" aria-label="Choose a capability">{features.map((item, index) => <button key={item.key} role="tab" aria-selected={active === index} aria-controls="feature-panel" className={active === index ? "active" : ""} onClick={() => setActive(index)}>{item.label}</button>)}</div>
      <div className="showcase-body" id="feature-panel" role="tabpanel" aria-live="polite">
        <div className="showcase-copy"><span className="mono">0{active + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p><div className="showcase-controls"><button className="icon-button" onClick={() => move(-1)} aria-label="Previous capability"><ArrowLeft aria-hidden="true" /></button><span className="mono">{active + 1} / {features.length}</span><button className="icon-button" onClick={() => move(1)} aria-label="Next capability"><ArrowRight aria-hidden="true" /></button></div></div>
        <div className="showcase-visual" aria-label={`${feature.label} interface preview`}>
          {feature.key === "today" ? <TodayPreview /> : feature.key === "inbox" ? <InboxPreview /> : feature.key === "workspace" ? <WorkspacePreview /> : <ControlPreview />}
        </div>
      </div>
    </div>
  );
}

function PreviewShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="preview-shell"><header><span className="preview-mark">R</span><b>{title}</b><span className="preview-command">⌘ K</span></header>{children}</div>;
}
function TodayPreview() { return <PreviewShell title="Today"><div className="preview-heading"><b>Good morning</b><span>3 items need attention</span></div><div className="preview-rows"><div><time>10:00</time><CalendarClock aria-hidden="true" /><span><b>Technical interview</b><small>Product Engineer · 60 min</small></span><em>Open prep</em></div><div><time>Today</time><Check aria-hidden="true" /><span><b>Follow up</b><small>Applied 6 days ago</small></span><em>Prepare</em></div><div><time>Inbox</time><Inbox aria-hidden="true" /><span><b>Review 2 jobs</b><small>Decide what enters the pipeline</small></span><em>Review</em></div></div></PreviewShell>; }
function InboxPreview() { return <PreviewShell title="Job inbox"><div className="preview-job"><span>Example Company</span><b>Product Engineer</b><small>Remote · Full-time · Company site</small><p>Build dependable product workflows with TypeScript and PostgreSQL.</p><div><em>Track opportunity</em><span>Maybe</span><span>Dismiss</span></div></div><div className="preview-job muted-preview"><span>Another Company</span><b>Full-Stack Engineer</b><small>Remote · APAC</small></div></PreviewShell>; }
function WorkspacePreview() { return <PreviewShell title="RLW-014"><div className="preview-heading"><b>Product Engineer · Example Company</b><span>Interested</span></div><div className="preview-workspace"><main><b>Role details</b><p>The source listing, description, and application link remain available.</p><b>Tasks</b><label><i /><span>Review requirements</span></label><label><i /><span>Prepare application</span></label></main><aside><small>Next action</small><b>Review requirements</b><span>Due Friday</span><em>Save next action</em></aside></div></PreviewShell>; }
function ControlPreview() { return <PreviewShell title="Privacy & data"><div className="preview-control"><Target aria-hidden="true" /><div><b>Private by default</b><p>Row-level security restricts workspace records to their authenticated owner.</p></div></div><div className="preview-control"><Check aria-hidden="true" /><div><b>Human-controlled workflow</b><p>Roleway organizes and prepares. You decide what moves forward.</p></div></div><div className="preview-control"><Inbox aria-hidden="true" /><div><b>Useful without AI</b><p>Tracking, tasks, notes, interviews, and insights stay available.</p></div></div></PreviewShell>; }
