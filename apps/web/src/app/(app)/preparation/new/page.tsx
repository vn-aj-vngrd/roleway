import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DateTimeField, SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { createInterview } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";

type OpportunityOption = { id: string; reference_number: number; jobs: { company: string; title: string } | null };

export default async function NewInterviewPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.supabase.from("opportunities").select("id, reference_number, jobs(company, title)").neq("stage", "closed").order("updated_at", { ascending: false });
  const opportunities = (data ?? []) as unknown as OpportunityOption[];
  return <div className="page narrow create-page"><header className="page-header create-page-header"><div><Link className="back-link" href="/preparation"><ArrowLeft />Interviews</Link><h1>Add interview</h1><p className="page-subtitle">Schedule the conversation against its Opportunity so preparation stays attached.</p></div></header>{opportunities.length ? <form action={createInterview} className="standalone-form"><section className="standalone-form-section"><header><h2>Interview details</h2><p>Choose the Opportunity and conversation format.</p></header><div><div className="field"><label htmlFor="opportunityId">Opportunity</label><SelectField id="opportunityId" name="opportunityId" required defaultValue={opportunities[0]?.id} options={opportunities.map((opportunity) => ({ value: opportunity.id, label: `RLW-${String(opportunity.reference_number).padStart(3, "0")} · ${opportunity.jobs?.company} · ${opportunity.jobs?.title}` }))} /></div><div className="field"><label htmlFor="interviewType">Interview type</label><SelectField id="interviewType" name="interviewType" defaultValue="Recruiter screen" options={["Recruiter screen", "Hiring manager", "Technical interview", "Behavioral interview", "System design", "Final interview"].map((label) => ({ value: label, label }))} /></div></div></section><section className="standalone-form-section"><header><h2>Schedule</h2><p>Set the start time and expected duration.</p></header><div className="field-grid"><div className="field"><label htmlFor="startsAt">Starts</label><DateTimeField id="startsAt" name="startsAt" required /></div><div className="field"><label htmlFor="durationMinutes">Duration</label><SelectField id="durationMinutes" name="durationMinutes" defaultValue="60" options={[15, 30, 45, 60, 90, 120].map((minutes) => ({ value: String(minutes), label: `${minutes} minutes` }))} /></div></div></section><footer className="standalone-form-actions"><Link className="button secondary" href="/preparation">Cancel</Link><SubmitButton pendingLabel="Scheduling…">Add interview</SubmitButton></footer></form> : <div className="empty-state"><h2>Track an Opportunity first</h2><p>An interview needs an active Opportunity so its preparation has the right context.</p><Link className="button primary" href="/jobs/new">Add a job</Link></div>}</div>;
}
