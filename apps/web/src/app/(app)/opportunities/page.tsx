import { CalendarClock, Plus, Target } from "lucide-react";
import Link from "next/link";
import { PipelineBoard, type PipelineOpportunity } from "@/components/pipeline-board";
import { requireUser } from "@/lib/supabase/server";

const stages = ["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"] as const;


export default async function OpportunitiesPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data, error } = await auth.supabase
    .from("opportunities")
    .select("id, reference_number, stage, next_action, next_action_due_at, created_at, jobs(company, title, location, compensation, source)")
    .order("updated_at", { ascending: false });
  const opportunities = (data ?? []) as unknown as PipelineOpportunity[];
  const active = opportunities.filter((item) => item.stage !== "closed");
  const inProcess = opportunities.filter((item) => ["preparing", "applied", "interview", "offer"].includes(item.stage)).length;
  const needsAction = active.filter((item) => !item.next_action || (item.next_action_due_at && new Date(item.next_action_due_at).getTime() < Date.now())).length;

  return (
    <div className={`board-page ${opportunities.length > 0 ? "has-board" : ""}`}>
      <header className="page-header board-header">
        <div className="page-header-copy">
          <h1>Pipeline</h1>
          <p className="page-subtitle">Move serious roles forward without losing the next action.</p>
        </div>
        <Link className="button primary" href="/jobs/new"><Plus aria-hidden="true" />Add job</Link>
      </header>

      {error ? <div className="page"><div className="form-alert error">The pipeline could not be loaded.</div></div> : null}
      {!error && opportunities.length === 0 ? <div className="page narrow"><div className="empty-state"><span className="empty-icon"><Target /></span><h2>No tracked opportunities yet</h2><p>Add a job to your Inbox, review it, then choose “Track opportunity” to start managing the work.</p><Link className="button primary" href="/jobs/new">Add your first job</Link></div></div> : null}

      {opportunities.length > 0 ? <>
        <section className="board-summary" aria-label="Pipeline summary">
          <div><strong>{active.length}</strong><span>Active</span></div>
          <div><strong>{inProcess}</strong><span>In process</span></div>
          <div className={needsAction ? "attention" : ""}><strong>{needsAction}</strong><span>Need action</span></div>
          <p><CalendarClock aria-hidden="true" />Keep one concrete next action on every active role.</p>
        </section>
        <div className="board-toolbar"><span>{stages.length} stages</span><span className="board-toolbar-rule" /><span>Drag cards between stages. Keyboard: focus a card, then use Alt + ← or →.</span></div>
        <PipelineBoard opportunities={opportunities} />
      </> : null}
    </div>
  );
}
