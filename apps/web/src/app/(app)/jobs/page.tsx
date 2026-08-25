import { ExternalLink, Inbox, Plus } from "lucide-react";
import { setJobInboxState, trackJob } from "@/features/workspace/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ create?: string; import?: string; error?: string; created?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;

  const { data: jobs, error } = await auth.supabase
    .from("jobs")
    .select("id, company, title, location, compensation, remote_policy, source, source_url, description, inbox_state, imported_at")
    .in("inbox_state", ["new", "maybe"])
    .order("imported_at", { ascending: false });

  return (
    <div className="page narrow">
      <header className="page-header"><div className="page-header-copy"><h1>Job inbox</h1><p className="page-subtitle">Review candidate jobs before they enter your pipeline.</p></div><a className="button primary" href="/jobs/new"><Plus />Add job</a></header>
      {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
      {query.created ? <div className="form-alert success" role="status">Job added to your inbox.</div> : null}
      {error ? <div className="empty-state"><h2>Jobs could not be loaded</h2><p>Check your connection and refresh this page.</p></div> : null}
      {!error && jobs?.length === 0 ? <div className="empty-state"><span className="empty-icon"><Inbox /></span><h2>Your inbox is clear</h2><p>Add a promising job here first. You can review it before deciding whether to track it as an Opportunity.</p><a className="button primary" href="/jobs/new"><Plus />Add your first job</a></div> : null}
      {jobs && jobs.length > 0 ? <section className="job-record-list" aria-label="Job inbox">{jobs.map((job) => <article className="job-record" key={job.id}><div className="job-record-main"><div className="muted small">{job.company} · {job.source}</div><h2>{job.title}</h2><p className="page-subtitle">{[job.compensation, job.location, job.remote_policy].filter(Boolean).join(" · ") || "Details not provided"}</p>{job.description ? <p className="job-excerpt">{job.description.slice(0, 220)}{job.description.length > 220 ? "…" : ""}</p> : null}<div className="job-record-actions"><form action={trackJob}><input type="hidden" name="jobId" value={job.id} /><SubmitButton pendingLabel="Tracking…">Track opportunity</SubmitButton></form><form action={setJobInboxState}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="state" value="maybe" /><SubmitButton className="button secondary" pendingLabel="Saving…">Maybe</SubmitButton></form><form action={setJobInboxState}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="state" value="dismissed" /><SubmitButton className="button ghost" pendingLabel="Dismissing…">Dismiss</SubmitButton></form>{job.source_url ? <a className="button ghost" href={job.source_url} target="_blank" rel="noreferrer"><ExternalLink />Source</a> : null}</div></div><span className="tag">{job.inbox_state === "maybe" ? "Maybe" : "New"}</span></article>)}</section> : null}
    </div>
  );
}
