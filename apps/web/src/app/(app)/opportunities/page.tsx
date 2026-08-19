import { Plus, Target } from "lucide-react";
import Link from "next/link";
import { updateOpportunityStage } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";

const stages = ["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"] as const;
const labels: Record<(typeof stages)[number], string> = { inbox: "Inbox", interested: "Interested", preparing: "Preparing", applied: "Applied", interview: "Interview", offer: "Offer", closed: "Closed" };

type OpportunityRow = {
  id: string;
  reference_number: number;
  stage: (typeof stages)[number];
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  jobs: { company: string; title: string; location: string; compensation: string; source: string } | null;
};

export default async function OpportunitiesPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data, error } = await auth.supabase.from("opportunities").select("id, reference_number, stage, next_action, next_action_due_at, created_at, jobs(company, title, location, compensation, source)").order("updated_at", { ascending: false });
  const opportunities = (data ?? []) as unknown as OpportunityRow[];

  return <div className="board-page"><header className="page-header"><div className="page-header-copy"><h1>Opportunities</h1><p className="page-subtitle">{opportunities.filter((item) => item.stage !== "closed").length} active · move each one with a clear next action</p></div><Link className="button primary" href="/jobs?create=true"><Plus />Add job</Link></header>{error ? <div className="page"><div className="form-alert error">Opportunities could not be loaded.</div></div> : null}{!error && opportunities.length === 0 ? <div className="page narrow"><div className="empty-state"><span className="empty-icon"><Target /></span><h2>No tracked opportunities yet</h2><p>Add a job to your Inbox, review it, then choose “Track opportunity” to begin managing the work.</p><Link className="button primary" href="/jobs?create=true">Add your first job</Link></div></div> : null}{opportunities.length > 0 ? <div className="board" aria-label="Opportunity pipeline">{stages.map((stage) => { const items = opportunities.filter((item) => item.stage === stage); return <section className="board-column" key={stage}><header className="column-head"><span className="status-dot" /><span>{labels[stage]}</span><span className="column-count">{items.length}</span></header>{items.map((item) => <article className="opportunity-card" key={item.id}><Link href={`/opportunities/${item.id}`}><div className="card-company">{item.jobs?.company ?? "Unknown company"}</div><div className="card-role">{item.jobs?.title ?? "Untitled role"}</div><div className="card-meta">{[item.jobs?.compensation, item.jobs?.location].filter(Boolean).join(" · ") || "No details yet"}</div><div className="card-action"><span className="status-dot" /><span>{item.next_action || "Set a next action"}</span></div><div className="card-source"><span className="mono">RLW-{String(item.reference_number).padStart(3, "0")}</span><span>{item.jobs?.source}</span></div></Link><form action={updateOpportunityStage}><input type="hidden" name="opportunityId" value={item.id} /><input type="hidden" name="returnTo" value="/opportunities" /><label className="sr-only" htmlFor={`stage-${item.id}`}>Move opportunity</label><select className="card-stage-select" id={`stage-${item.id}`} name="stage" defaultValue={item.stage}>{stages.filter((value) => value !== "closed").map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select><SubmitButton className="button ghost stage-save" pendingLabel="Moving…">Move</SubmitButton></form></article>)}{items.length === 0 ? <p className="faint small" style={{ padding: "14px 6px" }}>No opportunities</p> : null}</section>; })}</div> : null}</div>;
}
