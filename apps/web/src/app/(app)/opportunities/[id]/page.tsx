import { formatOpportunityTicket } from "@roleway/core";
import { ArrowRight, CalendarClock, FileText, Mail, Navigation, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceBreadcrumbs } from "@/components/app-shell";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CreateModal } from "@/components/create-modal";
import { DateTimeField, SelectField } from "@/components/form-controls";
import { OpportunityDetailsEditor } from "@/components/opportunity-details-editor";
import { OpportunityPropertiesEditor } from "@/components/opportunity-properties-editor";
import { OpportunityStageControl } from "@/components/opportunity-stage-control";
import { SubmitButton } from "@/components/submit-button";
import { requireSearchContext } from "@/features/projects/context";
import { createContact, deleteContact, deleteNote, deleteTask, submitApplication, updateContact, updateOpportunityAssessment } from "@/features/opportunities/actions";
import { addNote, createTask, toggleTask, updateNextAction } from "@/features/workspace/actions";
import { richTextForEditor } from "@/lib/rich-text";

type Workspace = {
  id: string;
  reference_number: number;
  stage: string;
  priority: "low" | "medium" | "high" | "urgent";
  excitement: number | null;
  deadline: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  updated_at: string;
  jobs: { id: string; company: string; title: string; description: string; location: string; compensation: string; remote_policy: string; source: string; source_url: string | null; application_url: string | null } | null;
};

type ApplicationRecord = { id: string; submitted_at: string; channel: string; confirmation_reference: string; resume_document_id: string | null; cover_letter_document_id: string | null; resume_version: { version: number; title: string } | null; cover_letter_version: { version: number; title: string } | null; portfolio_url: string | null; salary_expectation: string; notes: string };
type OpportunityDocument = { id: string; title: string; kind: string; status: string; opportunity_id: string | null; updated_at: string };
type InterviewRow = { id: string; interview_type: string; starts_at: string; status: string; outcome: string | null };
type ContactRow = { id: string; name: string; role: string; company: string; relationship: string; email: string | null; phone: string | null; profile_url: string | null; notes: string; follow_up_at: string | null };
type NoteRow = { id: string; body: string; created_at: string };
type EventRow = { id: string; event_type: string; payload: Record<string, unknown>; actor: string; created_at: string };

export default async function OpportunityPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; apply?: string; contact?: string; applied?: string; assessmentSaved?: string; contactCreated?: string; contactSaved?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [{ id }, query, context] = await Promise.all([params, searchParams, requireSearchContext()]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const [opportunityResult, tasksResult, notesResult, eventsResult, applicationResult, interviewsResult, documentsResult, contactsResult] = await Promise.all([
    context.supabase.from("opportunities").select("id, reference_number, stage, priority, excitement, deadline, next_action, next_action_due_at, created_at, updated_at, jobs(id, company, title, description, location, compensation, remote_policy, source, source_url, application_url)").eq("id", id).eq("project_id", context.project.id).maybeSingle(),
    context.supabase.from("tasks").select("id, title, category, priority, status, due_at, created_at").eq("opportunity_id", id).eq("project_id", context.project.id).order("created_at"),
    context.supabase.from("opportunity_notes").select("id, body, created_at").eq("opportunity_id", id).order("created_at", { ascending: false }),
    context.supabase.from("opportunity_events").select("id, event_type, payload, actor, created_at").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(50),
    context.supabase.from("application_records").select("id, submitted_at, channel, confirmation_reference, resume_document_id, cover_letter_document_id, resume_version:document_versions!application_records_resume_version_id_fkey(version, title), cover_letter_version:document_versions!application_records_cover_letter_version_id_fkey(version, title), portfolio_url, salary_expectation, notes").eq("opportunity_id", id).eq("project_id", context.project.id).maybeSingle(),
    context.supabase.from("interviews").select("id, interview_type, starts_at, status, outcome").eq("opportunity_id", id).eq("project_id", context.project.id).order("starts_at", { ascending: false }),
    context.supabase.from("documents").select("id, title, kind, status, opportunity_id, updated_at").eq("project_id", context.project.id).order("updated_at", { ascending: false }),
    context.supabase.from("contacts").select("id, name, role, company, relationship, email, phone, profile_url, notes, follow_up_at").eq("opportunity_id", id).eq("project_id", context.project.id).order("updated_at", { ascending: false }),
  ]);

  if (opportunityResult.error) throw new Error("Opportunity could not be loaded.");
  if (!opportunityResult.data) notFound();

  const item = opportunityResult.data as unknown as Workspace;
  const job = item.jobs;
  const tasks = tasksResult.data ?? [];
  const notes = (notesResult.data ?? []) as NoteRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const application = applicationResult.data as ApplicationRecord | null;
  const interviews = (interviewsResult.data ?? []) as InterviewRow[];
  const documents = (documentsResult.data ?? []) as OpportunityDocument[];
  const linkedDocuments = documents.filter((document) => document.opportunity_id === item.id);
  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const editingContact = contacts.find((contact) => contact.id === query.contact) ?? null;
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const ticket = formatOpportunityTicket(context.project.ticket_key, item.reference_number);
  const partialError = tasksResult.error || notesResult.error || eventsResult.error || applicationResult.error || interviewsResult.error || documentsResult.error || contactsResult.error;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const timeline = [
    ...notes.map((note) => ({ id: `note-${note.id}`, kind: "note" as const, title: note.body, actor: "you", createdAt: note.created_at, noteId: note.id })),
    ...events.map((event) => ({ id: `event-${event.id}`, kind: "event" as const, title: eventLabel(event), actor: event.actor, createdAt: event.created_at, noteId: null })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <div className="opportunity-workspace linear-ticket">
    <WorkspaceBreadcrumbs items={[{ label: "Opportunities", href: "/opportunities" }, { label: `${ticket} ${job?.title ?? "Untitled role"}` }]} />
    {query.error ? <div className="workspace-alert form-alert error" role="alert">{query.error}</div> : null}
    {query.applied ? <div className="workspace-alert form-alert success" role="status">Application recorded. A seven-day follow-up is now on Home.</div> : null}
    {query.assessmentSaved ? <div className="workspace-alert form-alert success" role="status">Priority and decision criteria saved.</div> : null}
    {query.contactCreated ? <div className="workspace-alert form-alert success" role="status">Contact added to this Opportunity.</div> : null}
    {query.contactSaved ? <div className="workspace-alert form-alert success" role="status">Contact updated.</div> : null}
    {partialError ? <div className="workspace-alert form-alert error" role="alert">Some Opportunity context could not be loaded. Refresh to try again.</div> : null}

    <div className="workspace-grid">
      <main className="workspace-main opportunity-tab-panel">
        {job ? <OpportunityDetailsEditor opportunityId={item.id} importedAt={item.created_at} ticket={ticket} descriptionHtml={richTextForEditor(job.description)} job={job} /> : <section className="ticket-section"><h2>Description</h2><p className="empty-inline">The linked Job is no longer available.</p></section>}

        <div className="ticket-body">
          <section className="ticket-section application-section" aria-labelledby="application-heading">
            <div className="ticket-section-heading"><div><h2 id="application-heading">Application</h2><span>{application ? "Submitted" : "Not submitted"}</span></div><p>Preserve when, where, and exactly what you submitted.</p></div>
            {application ? <div className="application-record"><div className="application-record-primary"><Mail aria-hidden="true" /><span><strong>Submitted {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.submitted_at))}</strong><small>{channelLabel(application.channel)}{application.confirmation_reference ? ` · ${application.confirmation_reference}` : ""}</small></span></div><dl><div><dt>Resume</dt><dd>{application.resume_document_id ? <Link href={`/documents/${application.resume_document_id}`}>{application.resume_version?.title ?? documentsById.get(application.resume_document_id)?.title ?? "Submitted resume"}{application.resume_version ? ` · version ${application.resume_version.version}` : ""}</Link> : "Not recorded"}</dd></div><div><dt>Cover letter</dt><dd>{application.cover_letter_document_id ? <Link href={`/documents/${application.cover_letter_document_id}`}>{application.cover_letter_version?.title ?? documentsById.get(application.cover_letter_document_id)?.title ?? "Submitted cover letter"}{application.cover_letter_version ? ` · version ${application.cover_letter_version.version}` : ""}</Link> : "Not recorded"}</dd></div>{application.salary_expectation ? <div><dt>Salary response</dt><dd>{application.salary_expectation}</dd></div> : null}{application.portfolio_url ? <div><dt>Portfolio</dt><dd><a href={application.portfolio_url} target="_blank" rel="noreferrer">Open submitted link</a></dd></div> : null}</dl>{application.notes ? <p>{application.notes}</p> : null}<Link className="button secondary" href={`/opportunities/${item.id}?apply=true`}>Update application record</Link></div> : <div className="ticket-empty-action"><div><h3>Record the submission when you apply</h3><p>Roleway will move this Opportunity to Applied and create a follow-up without contacting the employer.</p></div><Link className="button primary" href={`/opportunities/${item.id}?apply=true`}>Mark application submitted</Link></div>}
          </section>

          <section className="ticket-section ticket-subtasks" aria-labelledby="ticket-tasks-heading">
            <div className="ticket-section-heading"><div><h2 id="ticket-tasks-heading">Tasks</h2><span>{completedTasks}/{tasks.length}</span></div><p>Keep application, follow-up, and preparation work attached to this role.</p></div>
            {tasks.length ? <div className="task-list">{tasks.map((task) => <div className="task-item" key={task.id}><form action={toggleTask} className="task-toggle-form"><input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="opportunityId" value={item.id} /><input type="hidden" name="status" value={task.status === "done" ? "todo" : "done"} /><button className={`task-check ${task.status === "done" ? "checked" : ""}`} aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`} data-tooltip={task.status === "done" ? "Reopen task" : "Complete task"} /></form><span className={task.status === "done" ? "task-done" : ""}>{task.title}</span><small className="task-category">{task.category}</small>{task.due_at ? <time className="muted small">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(task.due_at))}</time> : null}<ConfirmationDialog title={`Delete “${task.title}”?`} description="This removes the task from the Opportunity and Home." action={deleteTask} confirmLabel="Delete task" pendingLabel="Deleting…" trigger={<Trash2 aria-hidden="true" />} triggerClassName="icon-button task-delete" triggerAriaLabel={`Delete ${task.title}`} triggerTooltip="Delete task" hiddenFields={{ taskId: task.id, opportunityId: item.id }} destructive /></div>)}</div> : <p className="ticket-empty-row">No tasks yet.</p>}
            <form action={createTask} className="quick-add opportunity-quick-add"><input type="hidden" name="opportunityId" value={item.id} /><label className="sr-only" htmlFor="task-title">Task title</label><input className="input" id="task-title" name="title" required autoComplete="off" placeholder="Add a task…" /><DateTimeField id="taskDueAt" name="dueAt" placeholder="Due date" /><SubmitButton className="button secondary" pendingLabel="Adding…"><Plus aria-hidden="true" />Add task</SubmitButton></form>
          </section>

          <section className="ticket-section related-context-section" aria-labelledby="interviews-heading">
            <div className="ticket-section-heading"><div><h2 id="interviews-heading">Interviews</h2><span>{interviews.length}</span></div><p>Scheduled conversations and their preparation stay in the Opportunity context.</p></div>
            {interviews.length ? <div className="related-record-list">{interviews.map((interview) => <Link href={`/interview/${interview.id}`} key={interview.id}><CalendarClock aria-hidden="true" /><span><strong>{interview.interview_type}</strong><small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(interview.starts_at))}</small></span><span className="tag">{interview.status}</span><span aria-hidden="true">→</span></Link>)}</div> : <p className="ticket-empty-row">No interviews scheduled.</p>}
            <Link className="button secondary related-add-button" href={`/interview?create=true&opportunity=${item.id}`}><Plus aria-hidden="true" />Add interview</Link>
          </section>

          <section className="ticket-section related-context-section" aria-labelledby="documents-heading">
            <div className="ticket-section-heading"><div><h2 id="documents-heading">Documents</h2><span>{linkedDocuments.length}</span></div><p>Keep drafts and submitted material attached to the role that gives them meaning.</p></div>
            {linkedDocuments.length ? <div className="related-record-list">{linkedDocuments.map((document) => <Link href={`/documents/${document.id}`} key={document.id}><FileText aria-hidden="true" /><span><strong>{document.title}</strong><small>{document.kind.replaceAll("_", " ")} · updated {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(document.updated_at))}</small></span><span className="tag">{document.status}</span><span aria-hidden="true">→</span></Link>)}</div> : <p className="ticket-empty-row">No documents attached.</p>}
            <Link className="button secondary related-add-button" href={`/documents?create=true&opportunity=${item.id}`}><Plus aria-hidden="true" />Create document</Link>
          </section>

          <section className="ticket-section related-context-section" aria-labelledby="contacts-heading">
            <div className="ticket-section-heading"><div><h2 id="contacts-heading">People</h2><span>{contacts.length}</span></div><p>Recruiters, interviewers, referrals, and follow-ups connected to this role.</p></div>
            {contacts.length ? <div className="contact-list">{contacts.map((contact) => <article key={contact.id}><UserRound aria-hidden="true" /><div><strong>{contact.name}</strong><small>{[contact.role, contact.company, relationshipLabel(contact.relationship)].filter(Boolean).join(" · ")}</small>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}</div>{contact.follow_up_at ? <time>Follow up {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(contact.follow_up_at))}</time> : null}<span className="contact-actions"><Link className="icon-button" data-tooltip="Edit contact" aria-label={`Edit ${contact.name}`} href={`/opportunities/${item.id}?contact=${contact.id}`}><Pencil aria-hidden="true" /></Link><ConfirmationDialog title={`Remove ${contact.name}?`} description="This removes the contact from the Opportunity. It does not contact the person." action={deleteContact} confirmLabel="Remove contact" pendingLabel="Removing…" trigger={<Trash2 aria-hidden="true" />} triggerClassName="icon-button" triggerAriaLabel={`Remove ${contact.name}`} triggerTooltip="Remove contact" hiddenFields={{ contactId: contact.id, opportunityId: item.id }} destructive /></span></article>)}</div> : <p className="ticket-empty-row">No people attached yet.</p>}
            <Link className="button secondary related-add-button" href={`/opportunities/${item.id}?contact=true`}><Plus aria-hidden="true" />Add contact</Link>
          </section>

          <section className="ticket-section ticket-activity" aria-labelledby="ticket-activity-heading">
            <div className="ticket-section-heading"><div><h2 id="ticket-activity-heading">Activity</h2><span>{timeline.length}</span></div><p>A readable record of decisions, submissions, conversations, and changes.</p></div>
            <form action={addNote} className="note-form opportunity-note-form"><input type="hidden" name="opportunityId" value={item.id} /><label className="sr-only" htmlFor="opportunity-note">Leave a note</label><textarea className="textarea" id="opportunity-note" name="body" required placeholder="Leave a note…" /><SubmitButton className="button secondary" pendingLabel="Posting…">Post note</SubmitButton></form>
            {timeline.length ? <ol className="activity-list compact-activity-list unified-timeline">{timeline.map((entry) => <li key={entry.id}><span className="status-dot" /><div><strong>{entry.title}</strong><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))} · {entry.actor}</time></div>{entry.kind === "note" && entry.noteId ? <ConfirmationDialog title="Delete this note?" description="This removes the note from the Opportunity timeline." action={deleteNote} confirmLabel="Delete note" pendingLabel="Deleting…" trigger={<Trash2 aria-hidden="true" />} triggerClassName="icon-button" triggerAriaLabel="Delete note" triggerTooltip="Delete note" hiddenFields={{ noteId: entry.noteId, opportunityId: item.id }} destructive /> : null}</li>)}</ol> : <p className="ticket-empty-row">Notes and updates will appear here.</p>}
          </section>
        </div>
      </main>

      <aside className="context-panel" aria-label="Opportunity details">
        <StageFocus stage={item.stage} opportunityId={item.id} interviewId={interviews[0]?.id ?? null} />
        <section className="next-action issue-next-action" id="next-action"><div className="context-section-heading"><h2>Next Action</h2>{item.next_action_due_at ? <span><CalendarClock aria-hidden="true" />{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(item.next_action_due_at))}</span> : null}</div><form action={updateNextAction}><input type="hidden" name="opportunityId" value={item.id} /><div className="field"><label htmlFor="nextAction">Action</label><input className="input" id="nextAction" name="nextAction" required defaultValue={item.next_action ?? ""} placeholder="What moves this forward?" /></div><div className="field"><label htmlFor="nextActionDueAt">Due</label><DateTimeField id="nextActionDueAt" name="nextActionDueAt" defaultValue={item.next_action_due_at ?? ""} /></div><SubmitButton className="button secondary" pendingLabel="Saving…">Save Next Action</SubmitButton></form></section>
        <section className="issue-status-panel"><h2>Status</h2><div className="ticket-stage-property"><span>Stage</span><OpportunityStageControl opportunityId={item.id} currentStage={item.stage} /></div></section>
        <section className="ticket-properties opportunity-assessment"><h2>Decision</h2><form action={updateOpportunityAssessment}><input type="hidden" name="opportunityId" value={item.id} /><div className="field"><label htmlFor="priority">Priority</label><SelectField id="priority" name="priority" defaultValue={item.priority} ariaLabel="Opportunity priority" options={[{ value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} /></div><div className="field"><label htmlFor="excitement">Excitement</label><SelectField id="excitement" name="excitement" defaultValue={item.excitement ? String(item.excitement) : ""} ariaLabel="Excitement" options={[{ value: "", label: "Not rated" }, ...[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value} of 5` }))]} /></div><div className="field"><label htmlFor="deadline">Application deadline</label><input className="input" id="deadline" name="deadline" type="date" defaultValue={item.deadline ?? ""} /></div><SubmitButton className="button secondary" pendingLabel="Saving…">Save decision</SubmitButton></form></section>
        <section className="ticket-properties role-properties"><h2>Role details</h2>{job ? <OpportunityPropertiesEditor opportunityId={item.id} job={job} /> : null}</section>
        <section className="opportunity-tools"><Link href={`/agent?opportunity=${item.id}`}><Navigation aria-hidden="true" /><span><strong>Ask Agent about this Opportunity</strong><small>Get grounded answers, prepare drafts, or propose the next piece of work.</small></span></Link></section>
      </aside>
    </div>

    {query.apply ? <CreateModal title={application ? "Update application" : "Record application"} description="Preserve the submission and create a predictable follow-up." context={ticket} closeHref={`/opportunities/${item.id}`} size="large"><ApplicationForm opportunityId={item.id} application={application} documents={documents} /></CreateModal> : null}
    {query.contact ? <CreateModal title={editingContact ? `Edit ${editingContact.name}` : "Add a contact"} description="Attach a recruiter, interviewer, referral, or other person to this Opportunity." context={ticket} closeHref={`/opportunities/${item.id}`}><ContactForm opportunityId={item.id} company={job?.company ?? ""} contact={editingContact} /></CreateModal> : null}
  </div>;
}

function StageFocus({ stage, opportunityId, interviewId }: { stage: string; opportunityId: string; interviewId: string | null }) {
  const focus = {
    interested: { title: "Decide whether to invest", copy: "Review the role, then commit to one concrete Next Action.", href: "#next-action", action: "Set Next Action" },
    preparing: { title: "Finish the application", copy: "Prepare the material you need, then preserve the exact submission.", href: `/opportunities/${opportunityId}?apply=true`, action: "Record application" },
    applied: { title: "Keep the follow-up explicit", copy: "Confirm when you will follow up instead of waiting without a plan.", href: "#next-action", action: "Set follow-up" },
    interview: { title: "Prepare for the conversation", copy: "Keep the plan, questions, and notes attached to this Opportunity.", href: interviewId ? `/interview/${interviewId}` : `/interview?create=true&opportunity=${opportunityId}`, action: interviewId ? "Open interview" : "Add interview" },
    offer: { title: "Evaluate the offer", copy: "Record the decision criteria and the next conversation or deadline.", href: "#next-action", action: "Set Next Action" },
    closed: { title: "Opportunity closed", copy: "The outcome and complete history remain available for review.", href: "", action: "" },
  }[stage] ?? { title: "Choose what happens next", copy: "Keep one concrete Next Action attached to this Opportunity.", href: "#next-action", action: "Set Next Action" };

  return <section className="stage-focus"><span>Current focus</span><h2>{focus.title}</h2><p>{focus.copy}</p>{focus.href ? <Link href={focus.href}>{focus.action}<ArrowRight aria-hidden="true" /></Link> : null}</section>;
}

function ApplicationForm({ opportunityId, application, documents }: { opportunityId: string; application: ApplicationRecord | null; documents: OpportunityDocument[] }) {
  const resumeOptions = documents.filter((document) => document.kind === "resume").map((document) => ({ value: document.id, label: document.title }));
  const letterOptions = documents.filter((document) => document.kind === "cover_letter").map((document) => ({ value: document.id, label: document.title }));
  return <form action={submitApplication} className="modal-create-form application-record-form"><input type="hidden" name="opportunityId" value={opportunityId} /><section className="form-section"><h2>Submission</h2><p>Record what actually happened. Roleway does not submit anything externally.</p><div className="field-grid"><div className="field"><label htmlFor="submittedAt">Submitted</label><DateTimeField id="submittedAt" name="submittedAt" required defaultValue={application?.submitted_at ?? new Date().toISOString()} /></div><div className="field"><label htmlFor="channel">Channel</label><SelectField id="channel" name="channel" defaultValue={application?.channel ?? "company_site"} ariaLabel="Application channel" options={[{ value: "company_site", label: "Company site" }, { value: "job_board", label: "Job board" }, { value: "email", label: "Email" }, { value: "referral", label: "Referral" }, { value: "other", label: "Other" }]} /></div></div><div className="field"><label htmlFor="confirmationReference">Confirmation</label><input className="input" id="confirmationReference" name="confirmationReference" defaultValue={application?.confirmation_reference ?? ""} placeholder="Confirmation number or note" /></div></section><section className="form-section"><h2>Submitted material</h2><p>Choose the exact versions you used so the record remains trustworthy later.</p><div className="field"><label htmlFor="resumeDocumentId">Resume</label><SelectField id="resumeDocumentId" name="resumeDocumentId" defaultValue={application?.resume_document_id ?? ""} ariaLabel="Submitted resume" options={[{ value: "", label: "Not recorded" }, ...resumeOptions]} /></div><div className="field"><label htmlFor="coverLetterDocumentId">Cover letter</label><SelectField id="coverLetterDocumentId" name="coverLetterDocumentId" defaultValue={application?.cover_letter_document_id ?? ""} ariaLabel="Submitted cover letter" options={[{ value: "", label: "Not recorded" }, ...letterOptions]} /></div><div className="field"><label htmlFor="portfolioUrl">Portfolio link</label><input className="input" id="portfolioUrl" name="portfolioUrl" type="url" defaultValue={application?.portfolio_url ?? ""} placeholder="https://…" /></div></section><section className="form-section"><h2>Application context</h2><div className="field"><label htmlFor="salaryExpectation">Salary response</label><input className="input" id="salaryExpectation" name="salaryExpectation" defaultValue={application?.salary_expectation ?? ""} placeholder="What did you enter or discuss?" /></div><div className="field"><label htmlFor="applicationNotes">Notes</label><textarea className="textarea" id="applicationNotes" name="notes" rows={4} defaultValue={application?.notes ?? ""} placeholder="Questions answered, work authorization, or anything you may need to remember…" /></div></section><footer className="composer-footer"><span className="composer-save-note">Saving moves the Opportunity to Applied and schedules a seven-day follow-up.</span><Link className="button secondary" href={`/opportunities/${opportunityId}`}>Cancel</Link><SubmitButton pendingLabel="Saving application…">{application ? "Update application" : "Record application"}</SubmitButton></footer></form>;
}

function ContactForm({ opportunityId, company, contact }: { opportunityId: string; company: string; contact: ContactRow | null }) {
  return <form action={contact ? updateContact : createContact} className="modal-create-form contact-create-form">{contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}<input type="hidden" name="opportunityId" value={opportunityId} /><section className="form-section"><h2>Person</h2><div className="field-grid"><div className="field"><label htmlFor="contactName">Name</label><input className="input" id="contactName" name="name" required autoFocus defaultValue={contact?.name ?? ""} /></div><div className="field"><label htmlFor="relationship">Relationship</label><SelectField id="relationship" name="relationship" defaultValue={contact?.relationship ?? "recruiter"} ariaLabel="Relationship" options={[{ value: "recruiter", label: "Recruiter" }, { value: "hiring_manager", label: "Hiring manager" }, { value: "interviewer", label: "Interviewer" }, { value: "referral", label: "Referral" }, { value: "colleague", label: "Former colleague" }, { value: "contact", label: "Networking contact" }]} /></div></div><div className="field-grid"><div className="field"><label htmlFor="contactRole">Role</label><input className="input" id="contactRole" name="role" defaultValue={contact?.role ?? ""} placeholder="Senior recruiter" /></div><div className="field"><label htmlFor="contactCompany">Company</label><input className="input" id="contactCompany" name="company" defaultValue={contact?.company ?? company} /></div></div></section><section className="form-section"><h2>Contact details</h2><div className="field-grid"><div className="field"><label htmlFor="contactEmail">Email</label><input className="input" id="contactEmail" name="email" type="email" defaultValue={contact?.email ?? ""} /></div><div className="field"><label htmlFor="contactPhone">Phone</label><input className="input" id="contactPhone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} /></div></div><div className="field"><label htmlFor="contactProfileUrl">Profile URL</label><input className="input" id="contactProfileUrl" name="profileUrl" type="url" defaultValue={contact?.profile_url ?? ""} placeholder="https://linkedin.com/in/…" /></div><div className="field"><label htmlFor="followUpAt">Follow up</label><DateTimeField id="followUpAt" name="followUpAt" defaultValue={contact?.follow_up_at ?? ""} /></div><div className="field"><label htmlFor="contactNotes">Notes</label><textarea className="textarea" id="contactNotes" name="notes" rows={4} defaultValue={contact?.notes ?? ""} placeholder="Context, what you discussed, and the next useful touchpoint…" /></div></section><footer className="composer-footer"><span className="composer-save-note">Follow-ups appear on Home.</span><Link className="button secondary" href={`/opportunities/${opportunityId}`}>Cancel</Link><SubmitButton pendingLabel="Saving contact…">{contact ? "Save contact" : "Add contact"}</SubmitButton></footer></form>;
}

function eventLabel(event: EventRow) {
  const labels: Record<string, string> = {
    opportunity_created: "Opportunity created",
    stage_changed: "Stage changed",
    application_submitted: "Application submitted",
    application_updated: "Application record updated",
    interview_scheduled: "Interview scheduled",
    interview_completed: "Interview completed",
    interview_cancelled: "Interview removed",
    contact_added: "Contact added",
    ai_suggestion_approved: "Agent suggestion used as Next Action",
  };
  if (event.event_type === "stage_changed") {
    const from = typeof event.payload.from === "string" ? event.payload.from : null;
    const to = typeof event.payload.to === "string" ? event.payload.to : null;
    if (from && to) return `${stageLabel(from)} → ${stageLabel(to)}`;
  }
  if (event.event_type === "contact_added" && typeof event.payload.name === "string") return `Added ${event.payload.name}`;
  return labels[event.event_type] ?? event.event_type.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase());
}

function stageLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function channelLabel(value: string) {
  return ({ company_site: "Company site", job_board: "Job board", email: "Email", referral: "Referral", other: "Other" } as Record<string, string>)[value] ?? value;
}

function relationshipLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
