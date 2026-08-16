"use client";

import { Check, ExternalLink, MinusCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { inboxJobs, requirements } from "@/lib/data";

export function JobInbox() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const job = inboxJobs[selected] ?? inboxJobs[0]!;

  const action = (value: "Track" | "Maybe" | "Dismiss") => setMessage(`${job.company} marked ${value.toLowerCase()}.`);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      if (key === "j") setSelected((current) => Math.min(current + 1, inboxJobs.length - 1));
      if (key === "k") setSelected((current) => Math.max(current - 1, 0));
      if (key === "a") action("Track");
      if (key === "m") action("Maybe");
      if (key === "d") action("Dismiss");
      if (key === "e") router.push("/opportunities/RLW-031");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="inbox-layout">
      <section className="inbox-list" aria-label="Job inbox">
        <header className="inbox-list-head"><div><h1>Job inbox</h1><p className="page-subtitle">12 new · J/K to navigate</p></div><div className="topbar-spacer" /><button className="button primary"><Plus />Import</button></header>
        {inboxJobs.map((item, index) => (
          <button key={`${item.company}-${item.role}`} className={`inbox-item ${selected === index ? "active" : ""}`} onClick={() => setSelected(index)}>
            <span><span className="inbox-role">{item.role}</span><span className="inbox-company"> · {item.company}</span></span>
            <span className={`fit ${item.fit >= 88 ? "high" : ""}`}>{item.fit}%</span>
            <span className="inbox-reason">{item.reason}</span><span className="faint small">{item.posted}</span>
          </button>
        ))}
      </section>
      <section className="inbox-detail" aria-label={`${job.company} job details`}>
        <header className="job-hero">
          <div className="muted small">{job.company} · {job.source}</div>
          <h1>{job.role}</h1>
          <p className="page-subtitle">{job.meta} · Posted {job.posted}</p>
          <div className="job-actions">
            <button className="button primary" onClick={() => action("Track")}><Check />Track <kbd>A</kbd></button>
            <button className="button secondary" onClick={() => action("Maybe")}><MinusCircle />Maybe <kbd>M</kbd></button>
            <button className="button ghost" onClick={() => action("Dismiss")}><X />Dismiss <kbd>D</kbd></button>
            <button className="button ghost"><ExternalLink />Open source</button>
          </div>
        </header>
        <section className="analysis-summary">
          <div><div className="score-large">{job.fit}%</div><div className="muted small">Overall fit</div></div>
          <div><h2>{job.recommendation}</h2><p className="page-subtitle">{job.reason}. You meet 8 of 10 major requirements.</p><div className="reason-list" style={{ marginTop: 12 }}><span>✓ TypeScript</span><span>✓ React</span><span>✓ Node.js</span><span className="muted">△ GraphQL</span><span className="muted">○ Kubernetes</span></div></div>
        </section>
        <section className="requirement-list">
          <div className="content-section-head"><div><h2>Requirements</h2><p className="page-subtitle">Evidence is linked to your approved Career Profile.</p></div><button className="button ghost">View reasoning</button></div>
          <div className="requirement-row header"><span>Requirement</span><span>Importance</span><span>Match</span><span>Evidence</span></div>
          {requirements.map((row) => <div className="requirement-row" key={row.requirement}><strong>{row.requirement}</strong><span className="muted">{row.importance}</span><span className={`match ${row.tone}`}>{row.match}</span><a href="/settings/profile">{row.evidence}</a></div>)}
        </section>
        <div className="sr-only" aria-live="polite">{message}</div>
      </section>
    </div>
  );
}
