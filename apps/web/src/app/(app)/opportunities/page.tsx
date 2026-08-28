import { Plus, Target } from "lucide-react";
import { redirect } from "next/navigation";
import { CreateJobButton } from "@/components/app-shell";
import { PipelineBoard, type PipelineOpportunity } from "@/components/pipeline-board";
import { WorkspaceHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";

export default async function OpportunitiesPage(props: { searchParams: Promise<{ error?: string }> }) {
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
  const active = opportunities.filter((item) => item.stage !== "closed");
  return (
    <div className={`workspace-page board-page ${opportunities.length > 0 ? "has-board" : ""}`}>
      <WorkspaceHeader title="Opportunities" count={`${active.length} active`} context={<>Every serious role and the Next Action that moves it forward.</>} actions={<CreateJobButton><Plus aria-hidden="true" />Add job</CreateJobButton>} />

      {query.error ? <div className="page"><div className="form-alert error" role="alert">{query.error}</div></div> : null}
      {error ? <div className="page"><div className="form-alert error" role="alert">The opportunities could not be loaded. Refresh to try again.</div></div> : null}
      {!error && opportunities.length === 0 ? <div className="page narrow"><div className="empty-state"><span className="empty-icon"><Target aria-hidden="true" /></span><h2>No tracked opportunities in this workspace</h2><p>Add a job to {context.project.name}, review it in the Inbox, then track it when it deserves active work.</p><CreateJobButton>Add your first job</CreateJobButton></div></div> : null}

      {opportunities.length > 0 ? <PipelineBoard opportunities={opportunities} now={new Date().toISOString()} ticketKey={context.project.ticket_key} /> : null}
    </div>
  );
}
