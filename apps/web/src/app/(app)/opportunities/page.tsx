import { ArrowUpRight, CalendarClock, Plus, Target } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { updateOpportunityStage } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";

const stages = ["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"] as const;
const labels: Record<(typeof stages)[number], string> = {
  inbox: "Inbox",
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

type OpportunityRow = {
  id: string;
  reference_number: number;
  stage: (typeof stages)[number];
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  jobs: { company: string; title: string; location: string; compensation: string; source: string } | null;
};

function dueLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const overdue = date.getTime() < Date.now();
  return { overdue, text: `${overdue ? "Overdue" : "Due"} ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}` };
}

export default async function OpportunitiesPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data, error } = await auth.supabase
    .from("opportunities")
    .select("id, reference_number, stage, next_action, next_action_due_at, created_at, jobs(company, title, location, compensation, source)")
    .order("updated_at", { ascending: false });
  const opportunities = (data ?? []) as unknown as OpportunityRow[];
  const active = opportunities.filter((item) => item.stage !== "closed");
  const inProcess = opportunities.filter((item) => ["preparing", "applied", "interview", "offer"].includes(item.stage)).length;
  const needsAction = active.filter((item) => !item.next_action || (item.next_action_due_at && new Date(item.next_action_due_at).getTime() < Date.now())).length;

  return (
    <div className="board-page">
      <header className="page-header board-header">
        <div className="page-header-copy">
          <h1>Pipeline</h1>
          <p className="page-subtitle">Move serious roles forward without losing the next action.</p>
        </div>
        <Link className="button primary" href="/jobs?create=true"><Plus aria-hidden="true" />Add job</Link>
      </header>

      {error ? <div className="page"><div className="form-alert error">The pipeline could not be loaded.</div></div> : null}
      {!error && opportunities.length === 0 ? <div className="page narrow"><div className="empty-state"><span className="empty-icon"><Target /></span><h2>No tracked opportunities yet</h2><p>Add a job to your Inbox, review it, then choose “Track opportunity” to start managing the work.</p><Link className="button primary" href="/jobs?create=true">Add your first job</Link></div></div> : null}

      {opportunities.length > 0 ? <>
        <section className="board-summary" aria-label="Pipeline summary">
          <div><strong>{active.length}</strong><span>Active</span></div>
          <div><strong>{inProcess}</strong><span>In process</span></div>
          <div className={needsAction ? "attention" : ""}><strong>{needsAction}</strong><span>Need action</span></div>
          <p><CalendarClock aria-hidden="true" />Keep one concrete next action on every active role.</p>
        </section>
        <div className="board-toolbar"><span>{stages.length} stages</span><span className="board-toolbar-rule" /><span>Use the move control on any card to update its stage.</span></div>
        <div className="board" aria-label="Opportunity pipeline">
          {stages.map((stage) => {
            const items = opportunities.filter((item) => item.stage === stage);
            return <section className="board-column" data-stage={stage} key={stage}>
              <header className="column-head"><span className="stage-marker" aria-hidden="true" /><span>{labels[stage]}</span><span className="column-count">{items.length}</span></header>
              <div className="board-card-stack">
                {items.map((item) => {
                  const due = dueLabel(item.next_action_due_at);
                  return <article className="opportunity-card" key={item.id}>
                    <Link className="opportunity-card-link" href={`/opportunities/${item.id}`}>
                      <div className="card-topline"><span className="card-company">{item.jobs?.company ?? "Unknown company"}</span><ArrowUpRight aria-hidden="true" /></div>
                      <div className="card-role">{item.jobs?.title ?? "Untitled role"}</div>
                      <div className="card-meta">{[item.jobs?.location, item.jobs?.compensation].filter(Boolean).join(" · ") || "Details not added"}</div>
                      <div className="card-action"><span className="status-dot" /><span>{item.next_action || "Set a next action"}</span></div>
                      <div className="card-source"><span className="mono">RLW-{String(item.reference_number).padStart(3, "0")}</span>{due ? <time className={due.overdue ? "overdue" : ""}>{due.text}</time> : <span>{item.jobs?.source || "Manual"}</span>}</div>
                    </Link>
                    <form action={updateOpportunityStage} className="card-move-form">
                      <input type="hidden" name="opportunityId" value={item.id} />
                      <input type="hidden" name="returnTo" value="/opportunities" />
                      <label className="sr-only" htmlFor={`stage-${item.id}`}>Move {item.jobs?.title ?? "opportunity"} to stage</label>
                      <select className="card-stage-select" id={`stage-${item.id}`} name="stage" defaultValue={item.stage}>{stages.map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select>
                      <SubmitButton className="button ghost stage-save" pendingLabel="Moving…">Move</SubmitButton>
                    </form>
                  </article>;
                })}
                {items.length === 0 ? <div className="board-empty"><span />No opportunities</div> : null}
              </div>
            </section>;
          })}
        </div>
      </> : null}
    </div>
  );
}
