"use client";

import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, ExternalLink, Inbox, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { setJobInboxState, trackJob } from "@/features/workspace/actions";

type InboxJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  compensation: string;
  remote_policy: string;
  source: string;
  source_url: string | null;
  description: string;
  inbox_state: string;
  inbox_review_at: string | null;
  imported_at: string;
};

export function JobInbox({ jobs, projectName, minReviewDate, defaultReviewDate }: { jobs: InboxJob[]; projectName: string; minReviewDate: string; defaultReviewDate: string }) {
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [laterOpen, setLaterOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, jobs.findIndex((job) => job.id === selectedId));
  const selected = jobs[selectedIndex] ?? jobs[0];

  useEffect(() => {
    if (!jobs.some((job) => job.id === selectedId)) {
      setSelectedId(jobs[0]?.id ?? "");
      setMobileOpen(false);
    }
  }, [jobs, selectedId]);

  useEffect(() => setLaterOpen(false), [selectedId]);

  const counts = useMemo(() => ({ new: jobs.filter((job) => job.inbox_state === "new").length, later: jobs.filter((job) => job.inbox_state === "maybe").length }), [jobs]);

  const selectIndex = (index: number) => {
    const next = jobs[Math.min(Math.max(index, 0), jobs.length - 1)];
    if (!next) return;
    setSelectedId(next.id);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-job-id="${next.id}"]`)?.focus());
  };

  if (!selected) return null;

  return <section className="triage-workspace" data-mobile-open={mobileOpen || undefined} aria-label="Job Inbox">
    <aside className="triage-list-panel">
      <header className="triage-list-header"><div><strong>Review queue</strong><span>{jobs.length}</span></div><p><span>{counts.new} new</span><span>{counts.later} later</span></p></header>
      <div className="triage-list" ref={listRef} role="listbox" aria-label="Jobs to review" onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key.toLowerCase() === "j") { event.preventDefault(); selectIndex(selectedIndex + 1); }
        if (event.key === "ArrowUp" || event.key.toLowerCase() === "k") { event.preventDefault(); selectIndex(selectedIndex - 1); }
        if (event.key === "Enter") { event.preventDefault(); setMobileOpen(true); }
      }}>
        {jobs.map((job) => <button type="button" role="option" aria-selected={job.id === selected.id} className="triage-list-row" data-job-id={job.id} key={job.id} onClick={() => { setSelectedId(job.id); setMobileOpen(true); }}>
          <span className="triage-company-mark" aria-hidden="true">{job.company.slice(0, 1).toUpperCase()}</span>
          <span className="triage-row-copy"><strong>{job.title}</strong><small>{job.company}</small><span>{[job.location, job.compensation].filter(Boolean).join(" · ") || "Details not provided"}</span></span>
          <span className={`triage-state ${job.inbox_state}`}>{job.inbox_state === "maybe" ? job.inbox_review_at ? `Later · ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(job.inbox_review_at))}` : "Later" : "New"}</span>
        </button>)}
      </div>
      <footer className="triage-list-footer"><span><kbd>J</kbd><kbd>K</kbd> Navigate</span><span><kbd>↵</kbd> Open</span></footer>
    </aside>

    <article className="triage-detail" aria-labelledby={`job-${selected.id}-title`}>
      <button className="button ghost triage-mobile-back" type="button" onClick={() => setMobileOpen(false)}><ArrowLeft aria-hidden="true" />Back to Inbox</button>
      <header className="triage-detail-header">
        <div className="triage-detail-identity"><span className="triage-company-mark large" aria-hidden="true">{selected.company.slice(0, 1).toUpperCase()}</span><div><span>{selected.company}</span><h2 id={`job-${selected.id}-title`}>{selected.title}</h2><p>{[selected.location, selected.remote_policy, selected.compensation].filter(Boolean).join(" · ") || "Role details not provided"}</p></div></div>
        {selected.source_url ? <a className="button ghost" href={selected.source_url} target="_blank" rel="noreferrer">Open listing <ExternalLink aria-hidden="true" /></a> : null}
      </header>

      <div className="triage-action-bar" aria-label="Triage actions">
        <form action={trackJob}><input type="hidden" name="jobId" value={selected.id} /><SubmitButton pendingLabel="Tracking…"><CheckCircle2 aria-hidden="true" />Track Opportunity</SubmitButton></form>
        <button className="button secondary" type="button" aria-expanded={laterOpen} aria-controls={`review-later-${selected.id}`} onClick={() => setLaterOpen((current) => !current)}><CalendarClock aria-hidden="true" />Review later</button>
        <form action={setJobInboxState}><input type="hidden" name="jobId" value={selected.id} /><input type="hidden" name="state" value="dismissed" /><SubmitButton className="button ghost" pendingLabel="Dismissing…">Dismiss</SubmitButton></form>
        <span className="triage-position">{selectedIndex + 1} of {jobs.length}</span>
        {laterOpen ? <form action={setJobInboxState} className="triage-later-popover floating-panel" id={`review-later-${selected.id}`} key={selected.id}>
          <input type="hidden" name="jobId" value={selected.id} />
          <input type="hidden" name="state" value="maybe" />
          <label htmlFor={`review-at-${selected.id}`}>Return to Inbox</label>
          <input className="input" id={`review-at-${selected.id}`} name="reviewAt" type="date" required min={minReviewDate} defaultValue={selected.inbox_review_at?.slice(0, 10) ?? defaultReviewDate} autoFocus />
          <div><button className="button ghost" type="button" onClick={() => setLaterOpen(false)}>Cancel</button><SubmitButton pendingLabel="Saving…">Schedule</SubmitButton></div>
        </form> : null}
      </div>

      <div className="triage-detail-body">
        <main>
          <section><div className="triage-section-heading"><h3>Role description</h3><span>Captured {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(selected.imported_at))}</span></div>{selected.description ? <div className="triage-description">{selected.description}</div> : <div className="triage-empty-copy"><Inbox aria-hidden="true" /><p>No description was captured. Open the source listing or add the Job again with more context.</p></div>}</section>
        </main>
        <aside>
          <h3>Listing details</h3>
          <dl><div><dt>Company</dt><dd>{selected.company}</dd></div><div><dt>Location</dt><dd>{selected.location || "Not provided"}</dd></div><div><dt>Arrangement</dt><dd>{selected.remote_policy || "Not provided"}</dd></div><div><dt>Compensation</dt><dd>{selected.compensation || "Not provided"}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div></dl>
          <div className="triage-guidance"><BriefcaseBusiness aria-hidden="true" /><div><strong>Decide before tracking</strong><p>Track creates an Opportunity in {projectName}. Later returns the Job on the date you choose. Dismiss keeps it out of active work.</p></div></div>
        </aside>
      </div>
      <footer className="triage-detail-footer"><button className="icon-button" type="button" aria-label="Previous job" data-tooltip="Previous job" disabled={selectedIndex === 0} onClick={() => selectIndex(selectedIndex - 1)}><ArrowLeft aria-hidden="true" /></button><button className="icon-button" type="button" aria-label="Next job" data-tooltip="Next job" disabled={selectedIndex === jobs.length - 1} onClick={() => selectIndex(selectedIndex + 1)}><ArrowRight aria-hidden="true" /></button><span><MapPin aria-hidden="true" />{selected.location || "Location not provided"}</span></footer>
    </article>
  </section>;
}
