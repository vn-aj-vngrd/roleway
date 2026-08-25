import { CalendarClock, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceBreadcrumbs } from "@/components/app-shell";
import { DateTimeField } from "@/components/form-controls";
import { OpportunityDetailsEditor } from "@/components/opportunity-details-editor";
import { OpportunityStageControl } from "@/components/opportunity-stage-control";
import { SubmitButton } from "@/components/submit-button";
import { addNote, createTask, toggleTask, updateNextAction } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";

const tabs = ["overview", "tasks", "notes", "activity"] as const;
type Tab = (typeof tabs)[number];

type Workspace = {
  id: string;
  reference_number: number;
  stage: string;
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  jobs: { id: string; company: string; title: string; description: string; location: string; compensation: string; remote_policy: string; source: string; source_url: string | null; application_url: string | null } | null;
};

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; tab?: string }> }) {
  const [{ id }, query, auth] = await Promise.all([params, searchParams, requireUser()]);
  if (!auth) return null;

  const [opportunityResult, tasksResult, notesResult, eventsResult] = await Promise.all([
    auth.supabase.from("opportunities").select("id, reference_number, stage, next_action, next_action_due_at, created_at, jobs(id, company, title, description, location, compensation, remote_policy, source, source_url, application_url)").eq("id", id).maybeSingle(),
    auth.supabase.from("tasks").select("id, title, status, due_at, created_at").eq("opportunity_id", id).order("created_at"),
    auth.supabase.from("opportunity_notes").select("id, body, created_at").eq("opportunity_id", id).order("created_at", { ascending: false }),
    auth.supabase.from("opportunity_events").select("id, event_type, payload, actor, created_at").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (opportunityResult.error) throw new Error("Opportunity could not be loaded.");
  if (!opportunityResult.data) notFound();

  const item = opportunityResult.data as unknown as Workspace;
  const job = item.jobs;
  const tasks = tasksResult.data ?? [];
  const notes = notesResult.data ?? [];
  const events = eventsResult.data ?? [];
  const activeTab: Tab = tabs.includes(query.tab as Tab) ? query.tab as Tab : "overview";
  const ticket = `RLW-${String(item.reference_number).padStart(3, "0")}`;
  const partialError = tasksResult.error || notesResult.error || eventsResult.error;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const tabCounts: Partial<Record<Tab, number>> = { tasks: tasks.length, notes: notes.length, activity: events.length };

  return <div className="opportunity-workspace">
    <WorkspaceBreadcrumbs items={[{ label: "Pipeline", href: "/opportunities" }, { label: ticket }]} />
    {query.error ? <div className="workspace-alert form-alert error" role="alert">{query.error}</div> : null}
    {partialError ? <div className="workspace-alert form-alert error" role="alert">Some opportunity details could not be loaded. Refresh to try again.</div> : null}

    <header className="workspace-head">
      <div className="workspace-title-row">
        <div className="workspace-title">
          <div className="workspace-id mono">{ticket}</div>
          <h1>{job?.title ?? "Untitled role"}</h1>
          <div className="workspace-meta">{[job?.company, job?.location, job?.compensation, job?.remote_policy].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="workspace-header-actions">
          <OpportunityStageControl opportunityId={item.id} currentStage={item.stage} />
        </div>
      </div>
      <nav className="tabs opportunity-tabs" aria-label="Opportunity sections">
        {tabs.map((tab) => <Link key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} href={tab === "overview" ? `/opportunities/${item.id}` : `/opportunities/${item.id}?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined} scroll={false}>
          <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          {tabCounts[tab] !== undefined ? <span className="tab-count">{tabCounts[tab]}</span> : null}
        </Link>)}
      </nav>
    </header>

    <div className="workspace-grid">
      <main className="workspace-main opportunity-tab-panel">
        {activeTab === "overview" ? job ? <OpportunityDetailsEditor opportunityId={item.id} importedAt={item.created_at} job={job} /> : <section className="content-section"><h2>Role details</h2><p className="empty-inline">The linked job is no longer available.</p></section> : null}

        {activeTab === "tasks" ? <section className="content-section">
          <div className="content-section-head"><div><h2>Tasks</h2><p className="page-subtitle">Small, concrete work that advances this opportunity.</p></div><span className="section-summary">{completedTasks} of {tasks.length} complete</span></div>
          <form action={createTask} className="quick-add opportunity-quick-add"><input type="hidden" name="opportunityId" value={item.id} /><input className="input" name="title" required placeholder="Add a task…" /><DateTimeField id="taskDueAt" name="dueAt" placeholder="Due date" /><SubmitButton className="button secondary" pendingLabel="Adding…"><Plus aria-hidden="true" />Add task</SubmitButton></form>
          {tasks.length === 0 ? <p className="empty-inline">No tasks yet. Add the next concrete step above.</p> : <div className="task-list">{tasks.map((task) => <form action={toggleTask} className="task-item" key={task.id}><input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="opportunityId" value={item.id} /><input type="hidden" name="status" value={task.status === "done" ? "todo" : "done"} /><button className={`task-check ${task.status === "done" ? "checked" : ""}`} aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`} /><span className={task.status === "done" ? "task-done" : ""}>{task.title}</span>{task.due_at ? <time className="muted small">{new Date(task.due_at).toLocaleDateString()}</time> : null}</form>)}</div>}
        </section> : null}

        {activeTab === "notes" ? <section className="content-section">
          <div className="content-section-head"><div><h2>Notes</h2><p className="page-subtitle">Keep decisions, context, and useful details with this role.</p></div></div>
          <form action={addNote} className="note-form opportunity-note-form"><input type="hidden" name="opportunityId" value={item.id} /><textarea className="textarea" name="body" required placeholder="Capture context, decisions, or useful details…" /><SubmitButton className="button secondary" pendingLabel="Adding note…">Add note</SubmitButton></form>
          {notes.length === 0 ? <p className="empty-inline">No notes yet.</p> : <div className="note-list">{notes.map((note) => <article key={note.id}><p>{note.body}</p><time>{new Date(note.created_at).toLocaleString()}</time></article>)}</div>}
        </section> : null}

        {activeTab === "activity" ? <section className="content-section">
          <div className="content-section-head"><div><h2>Activity</h2><p className="page-subtitle">A chronological record of changes to this opportunity.</p></div></div>
          {events.length === 0 ? <p className="empty-inline">Activity will appear as you move this opportunity forward.</p> : <ol className="activity-list">{events.map((event) => <li key={event.id}><span className="status-dot" /><div><strong>{event.event_type.replaceAll("_", " ")}</strong><time>{new Date(event.created_at).toLocaleString()} · {event.actor}</time></div></li>)}</ol>}
        </section> : null}
      </main>

      <aside className="context-panel" aria-label="Opportunity context">
        <section className="next-action">
          <div className="context-section-heading"><h2>Next action</h2>{item.next_action_due_at ? <span><CalendarClock aria-hidden="true" />{new Date(item.next_action_due_at).toLocaleDateString()}</span> : null}</div>
          <p>Keep one concrete step ready for this opportunity.</p>
          <form action={updateNextAction}><input type="hidden" name="opportunityId" value={item.id} /><div className="field"><label htmlFor="nextAction">Action</label><input className="input" id="nextAction" name="nextAction" required defaultValue={item.next_action ?? ""} placeholder="What happens next?" /></div><div className="field"><label htmlFor="nextActionDueAt">Due</label><DateTimeField id="nextActionDueAt" name="nextActionDueAt" defaultValue={item.next_action_due_at ?? ""} /></div><SubmitButton pendingLabel="Saving action…">Save next action</SubmitButton></form>
        </section>
        <section className="opportunity-progress"><div><span>Task progress</span><strong>{tasks.length ? `${Math.round((completedTasks / tasks.length) * 100)}%` : "—"}</strong></div><div className="progress"><span style={{ width: tasks.length ? `${(completedTasks / tasks.length) * 100}%` : "0%" }} /></div><p>{completedTasks} of {tasks.length} tasks complete</p></section>
        <section className="opportunity-tools"><h2>Tools</h2><Link href={`/assistant?opportunity=${item.id}`}><NotebookPen aria-hidden="true" /><span><strong>Open Assist</strong><small>Prepare drafts and interview material using this opportunity.</small></span></Link></section>
      </aside>
    </div>
  </div>;
}
