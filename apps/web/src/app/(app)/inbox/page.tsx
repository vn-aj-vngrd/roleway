import { Clock3, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateJobButton } from "@/components/app-shell";
import { JobInbox } from "@/components/job-inbox";
import { EmptyState, ViewToolbar, WorkspaceHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { richTextToPlainText } from "@/lib/rich-text";

export default async function JobsPage(
  props: { searchParams: Promise<{ create?: string; error?: string; created?: string; welcome?: string; view?: string }> }
) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const { data: jobs, error } = await context.supabase
    .from("jobs")
    .select("id, company, title, location, compensation, remote_policy, source, source_url, description, inbox_state, inbox_review_at, imported_at")
    .eq("project_id", context.project.id)
    .in("inbox_state", ["new", "maybe"])
    .order("imported_at", { ascending: false })
    .limit(500);

  const now = new Date();
  const allJobs = jobs ?? [];
  const laterJobs = allJobs.filter((job) => job.inbox_state === "maybe" && job.inbox_review_at && new Date(job.inbox_review_at) > now);
  const reviewJobs = allJobs.filter((job) => job.inbox_state === "new" || !job.inbox_review_at || new Date(job.inbox_review_at) <= now);
  const showingLater = query.view === "later";
  const visibleJobs = showingLater ? laterJobs : reviewJobs;
  const minReviewDate = now.toISOString().slice(0, 10);
  const defaultReviewDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().slice(0, 10);

  return (
    <div className="workspace-page inbox-page">
      <WorkspaceHeader title="Inbox" count={allJobs.length} context={<>Review saved jobs before they enter {context.project.name}&apos;s pipeline.</>} actions={<CreateJobButton><Plus aria-hidden="true" />Add job</CreateJobButton>} />
      {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
      {query.welcome ? <div className="welcome-banner"><Inbox aria-hidden="true" /><div><strong>{context.project.name} is ready.</strong><p>Add one promising Job. It stays in the Inbox until you decide to track it.</p></div></div> : null}
      {query.created ? <div className="form-alert success" role="status">Job added to {context.project.name}.</div> : null}
      {!error && allJobs.length > 0 ? <ViewToolbar label="Inbox views" primary={<nav className="inbox-view-tabs" aria-label="Inbox views"><Link aria-current={!showingLater ? "page" : undefined} href="/inbox">Review now <span>{reviewJobs.length}</span></Link><Link aria-current={showingLater ? "page" : undefined} href="/inbox?view=later">Later <span>{laterJobs.length}</span></Link></nav>} actions={<span className="workspace-toolbar-note">J/K to move · Enter to open</span>} /> : null}
      {error ? <EmptyState title="Jobs could not be loaded" description="Check your connection and refresh this page." /> : null}
      {!error && allJobs.length === 0 ? <EmptyState icon={<Inbox />} title="This workspace’s Inbox is clear" description="Add a promising Job here first. You can review it before deciding whether to track it as an Opportunity." actions={<CreateJobButton><Plus aria-hidden="true" />Add your first Job</CreateJobButton>} /> : null}
      {!error && allJobs.length > 0 && visibleJobs.length === 0 ? <div className="empty-state"><span className="empty-icon">{showingLater ? <Clock3 aria-hidden="true" /> : <Inbox aria-hidden="true" />}</span><h2>{showingLater ? "Nothing is waiting for later" : "Nothing needs review now"}</h2><p>{showingLater ? "Choose Later on a Job and set the date when it should return." : laterJobs.length ? "Deferred Jobs will return here on their review date." : "Add another Job when you find a promising role."}</p>{showingLater ? <Link className="button secondary" href="/inbox">Return to review queue</Link> : <CreateJobButton><Plus aria-hidden="true" />Add a Job</CreateJobButton>}</div> : null}
      {visibleJobs.length > 0 ? <JobInbox jobs={visibleJobs.map((job) => ({ ...job, description: richTextToPlainText(job.description) }))} projectName={context.project.name} minReviewDate={minReviewDate} defaultReviewDate={defaultReviewDate} /> : null}
    </div>
  );
}
