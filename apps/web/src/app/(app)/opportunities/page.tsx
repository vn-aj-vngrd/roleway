import { Inbox, Plus, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateJobButton } from "@/components/app-shell";
import { PipelineBoard, type PipelineFilter, type PipelineOpportunity } from "@/components/pipeline-board";
import { EmptyState, WorkspaceHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";

export default async function OpportunitiesPage(props: { searchParams: Promise<{ error?: string; view?: string }> }) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const { data, error } = await context.supabase
    .from("opportunities")
    .select("id, reference_number, stage, priority, excitement, deadline, next_action, next_action_due_at, created_at, updated_at, jobs(company, title, location, compensation, source)")
    .eq("project_id", context.project.id)
    .order("updated_at", { ascending: false })
    .limit(1000);
  const opportunities = (data ?? []) as unknown as PipelineOpportunity[];
  const { data: inboxJobs } = !error && opportunities.length === 0
    ? await context.supabase
      .from("jobs")
      .select("id")
      .eq("project_id", context.project.id)
      .or(`inbox_state.eq.new,and(inbox_state.eq.maybe,inbox_review_at.is.null),and(inbox_state.eq.maybe,inbox_review_at.lte.${new Date().toISOString()})`)
      .limit(1)
    : { data: null };
  const hasReviewJobs = Boolean(inboxJobs?.length);
  const active = opportunities.filter((item) => item.stage !== "closed");
  const initialFilter: PipelineFilter | undefined = ["active", "attention", "closed"].includes(query.view ?? "") ? query.view as PipelineFilter : undefined;
  return (
    <div className={`workspace-page board-page ${opportunities.length > 0 ? "has-board" : ""}`}>
      <WorkspaceHeader title="Opportunities" count={active.length} context={<>Every serious role and the Next Action that moves it forward.</>} actions={<CreateJobButton><Plus aria-hidden="true" />Add job</CreateJobButton>} />

      {query.error ? <div className="page"><div className="form-alert error" role="alert">{query.error}</div></div> : null}
      {error ? <div className="page"><div className="form-alert error" role="alert">The opportunities could not be loaded. Refresh to try again.</div></div> : null}
      {!error && opportunities.length === 0 ? (
        <div className="page narrow">
          <EmptyState
            className="opportunities-empty-state"
            icon={<Target />}
            title="No opportunities yet"
            description="Track jobs from your Inbox to manage applications and next steps."
            actions={hasReviewJobs
              ? <Link className="button primary" href="/inbox"><Inbox aria-hidden="true" />Review Inbox</Link>
              : <CreateJobButton><Plus aria-hidden="true" />Add a job</CreateJobButton>}
          />
        </div>
      ) : null}

      {opportunities.length > 0 ? <PipelineBoard opportunities={opportunities} now={new Date().toISOString()} ticketKey={context.project.ticket_key} {...(initialFilter ? { initialFilter } : {})} /> : null}
    </div>
  );
}
