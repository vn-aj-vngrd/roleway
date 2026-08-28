import { formatOpportunityTicket } from "@roleway/core";
import { CalendarClock, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceBreadcrumbs } from "@/components/app-shell";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DateTimeField, SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { deleteInterview, updateInterview } from "@/features/interviews/actions";
import { requireSearchContext } from "@/features/projects/context";

type InterviewWorkspace = {
  id: string;
  opportunity_id: string;
  interview_type: string;
  starts_at: string;
  duration_minutes: number | null;
  meeting_url: string | null;
  timezone: string;
  interviewers: string;
  preparation_notes: string;
  questions_to_ask: string;
  notes: string;
  outcome: string | null;
  status: "scheduled" | "completed" | "cancelled";
  opportunities: { id: string; reference_number: number; jobs: { company: string; title: string } | null } | null;
};

export default async function InterviewPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string; error?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [{ id }, query, context] = await Promise.all([params, searchParams, requireSearchContext()]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const { data, error } = await context.supabase
    .from("interviews")
    .select("id, opportunity_id, interview_type, starts_at, duration_minutes, meeting_url, timezone, interviewers, preparation_notes, questions_to_ask, notes, outcome, status, opportunities(id, reference_number, jobs(company, title))")
    .eq("id", id)
    .eq("project_id", context.project.id)
    .maybeSingle();
  if (error) throw new Error("The interview could not be loaded.");
  if (!data) notFound();
  const interview = data as unknown as InterviewWorkspace;
  const opportunity = interview.opportunities;
  const company = opportunity?.jobs?.company ?? "Unknown company";
  const role = opportunity?.jobs?.title ?? "Untitled role";
  const ticket = opportunity ? formatOpportunityTicket(context.project.ticket_key, opportunity.reference_number) : "Opportunity";

  return <div className="page interview-workspace-page">
    <WorkspaceBreadcrumbs items={[{ label: "Interviews", href: "/interview" }, { label: `${company} · ${interview.interview_type}` }]} />
    <header className="page-header"><div className="page-header-copy"><div className="workspace-id"><Link href={`/opportunities/${interview.opportunity_id}`}>{ticket}</Link> / {company}</div><h1>{interview.interview_type}</h1><p className="page-subtitle">{role} · {new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: interview.timezone, timeZoneName: "short" }).format(new Date(interview.starts_at))}</p></div><div className="content-section-actions">{interview.meeting_url ? <a className="button secondary" href={interview.meeting_url} target="_blank" rel="noreferrer">Join meeting <ExternalLink aria-hidden="true" /></a> : null}<ConfirmationDialog title="Delete this interview?" description="The scheduled event and its preparation notes will be removed. The Opportunity history remains." action={deleteInterview} confirmLabel="Delete interview" pendingLabel="Deleting…" trigger={<Trash2 aria-hidden="true" />} triggerClassName="icon-button" triggerAriaLabel="Delete interview" triggerTooltip="Delete interview" hiddenFields={{ interviewId: interview.id, opportunityId: interview.opportunity_id }} destructive /></div></header>
    {query.created ? <div className="form-alert success" role="status">Interview scheduled. A preparation task was added to the Opportunity.</div> : null}
    {query.saved ? <div className="form-alert success" role="status">Interview saved.</div> : null}
    {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}

    <form action={updateInterview} className="interview-workspace-form">
      <input type="hidden" name="interviewId" value={interview.id} />
      <input type="hidden" name="opportunityId" value={interview.opportunity_id} />
      <aside>
        <section><h2>Schedule</h2><div className="field"><label htmlFor="interviewType">Interview type</label><SelectField id="interviewType" name="interviewType" defaultValue={interview.interview_type} ariaLabel="Interview type" options={["Recruiter screen", "Hiring manager", "Technical interview", "Coding interview", "Behavioral interview", "System design", "Take-home review", "Panel interview", "Final interview"].map((label) => ({ value: label, label }))} /></div><div className="field"><label htmlFor="startsAt">Starts</label><DateTimeField id="startsAt" name="startsAt" required defaultValue={interview.starts_at} timeZone={interview.timezone} /></div><div className="field"><label htmlFor="durationMinutes">Duration</label><SelectField id="durationMinutes" name="durationMinutes" defaultValue={String(interview.duration_minutes ?? 60)} ariaLabel="Interview duration" options={[15, 30, 45, 60, 90, 120, 180].map((minutes) => ({ value: String(minutes), label: `${minutes} minutes` }))} /></div><div className="field"><label htmlFor="timezone">Timezone</label><input className="input" id="timezone" name="timezone" required defaultValue={interview.timezone} placeholder="America/New_York" /></div></section>
        <section><h2>Conversation</h2><div className="field"><label htmlFor="meetingUrl">Meeting URL</label><input className="input" id="meetingUrl" name="meetingUrl" type="url" defaultValue={interview.meeting_url ?? ""} placeholder="https://…" /></div><div className="field"><label htmlFor="interviewers">Interviewers</label><textarea className="textarea" id="interviewers" name="interviewers" rows={3} defaultValue={interview.interviewers} placeholder="Name · role · profile URL" /></div></section>
        <section><h2>Outcome</h2><div className="field"><label htmlFor="status">Status</label><SelectField id="status" name="status" defaultValue={interview.status} ariaLabel="Interview status" options={[{ value: "scheduled", label: "Scheduled" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }]} /></div><div className="field"><label htmlFor="outcome">Outcome</label><input className="input" id="outcome" name="outcome" defaultValue={interview.outcome ?? ""} placeholder="Advanced, waiting, declined…" /></div></section>
        <SubmitButton pendingLabel="Saving interview…">Save interview</SubmitButton>
      </aside>

      <main>
        <section className="interview-brief"><CalendarClock aria-hidden="true" /><div><h2>Prepare from the Opportunity</h2><p>Use the role description, people, prior notes, and application record as your source. Keep uncertain assumptions explicit.</p></div><Link className="button ghost" href={`/opportunities/${interview.opportunity_id}`}>Open {ticket}</Link></section>
        <section className="interview-writing-section"><label htmlFor="preparationNotes"><strong>Preparation plan</strong><span>Company context, role priorities, likely topics, stories, and technical areas.</span></label><textarea id="preparationNotes" name="preparationNotes" defaultValue={interview.preparation_notes} placeholder="What do you need to understand and practice before this conversation?" /></section>
        <section className="interview-writing-section"><label htmlFor="questionsToAsk"><strong>Questions to ask</strong><span>Questions that test the role, team, expectations, and decision criteria.</span></label><textarea id="questionsToAsk" name="questionsToAsk" defaultValue={interview.questions_to_ask} placeholder="What would make someone exceptional in this role after six months?" /></section>
        <section className="interview-writing-section"><label htmlFor="notes"><strong>Notes after the interview</strong><span>What happened, what you learned, commitments made, and what should happen next.</span></label><textarea id="notes" name="notes" defaultValue={interview.notes} placeholder="Capture details while the conversation is fresh…" /></section>
      </main>
    </form>
  </div>;
}
