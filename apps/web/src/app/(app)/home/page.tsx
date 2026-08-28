import { formatOpportunityTicket } from "@roleway/core";
import { ArrowRight, CalendarClock, CheckCircle2, Circle, Inbox, Plus, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateJobButton } from "@/components/app-shell";
import { HomeWorkspaceDetails, HomeWorkspaceOverview } from "@/components/home-workspace-overview";
import { WorkspaceHeader, WorkspaceListGroup } from "@/components/ui-primitives";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireSearchContext } from "@/features/projects/context";
import { toggleTask } from "@/features/workspace/actions";

type OpportunityRelation = { reference_number: number; jobs: { company: string; title: string } | null } | null;
type ActiveOpportunity = { id: string; reference_number: number; next_action: string | null; next_action_due_at: string | null; stage: string; updated_at: string; jobs: { company: string; title: string } | null };

type AttentionItem =
  | { kind: "interview"; id: string; timestamp: number; dateLabel: string; title: string; meta: string; opportunityId: string }
  | { kind: "task"; id: string; timestamp: number; dateLabel: string; title: string; meta: string; opportunityId: string | null }
  | { kind: "action"; id: string; timestamp: number; dateLabel: string; title: string; meta: string; opportunityId: string }
  | { kind: "contact"; id: string; timestamp: number; dateLabel: string; title: string; meta: string; opportunityId: string | null }
  | { kind: "inbox"; id: string; timestamp: number; dateLabel: string; title: string; meta: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string; projectCreated?: string; projectArchived?: string; workspaceSaved?: string; error?: string }> }) {
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project || !context.profile) redirect("/onboarding");

  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
  const projectId = context.project.id;
  const [tasksResult, interviewsResult, opportunitiesResult, activeCountResult, jobsResult, contactsResult] = await Promise.all([
    context.supabase.from("tasks").select("id, title, due_at, opportunity_id, opportunities(reference_number, jobs(company, title))").eq("project_id", projectId).in("status", ["todo", "doing"]).lte("due_at", tomorrow.toISOString()).order("due_at").limit(12),
    context.supabase.from("interviews").select("id, interview_type, starts_at, timezone, opportunity_id, opportunities(reference_number, jobs(company, title))").eq("project_id", projectId).eq("status", "scheduled").gte("starts_at", now.toISOString()).lte("starts_at", nextWeek.toISOString()).order("starts_at").limit(6),
    context.supabase.from("opportunities").select("id, reference_number, next_action, next_action_due_at, stage, updated_at, jobs(company, title)").eq("project_id", projectId).neq("stage", "closed").order("updated_at", { ascending: true }).limit(20),
    context.supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("project_id", projectId).neq("stage", "closed"),
    context.supabase.from("jobs").select("id, inbox_state, inbox_review_at").eq("project_id", projectId).in("inbox_state", ["new", "maybe"]).limit(500),
    context.supabase.from("contacts").select("id, name, company, role, follow_up_at, opportunity_id").eq("project_id", projectId).not("follow_up_at", "is", null).lte("follow_up_at", tomorrow.toISOString()).order("follow_up_at").limit(8),
  ]);

  const tasks = tasksResult.data ?? [];
  const interviews = interviewsResult.data ?? [];
  const opportunities = (opportunitiesResult.data ?? []) as unknown as ActiveOpportunity[];
  const contacts = contactsResult.data ?? [];
  const inboxCount = (jobsResult.data ?? []).filter((job) => job.inbox_state === "new" || !job.inbox_review_at || new Date(job.inbox_review_at) <= now).length;
  const activeCount = activeCountResult.count ?? 0;
  const attention = buildAttentionItems({ interviews, tasks, opportunities, contacts, inboxCount, now, ticketKey: context.project.ticket_key });
  const attentionGroups = groupAttentionItems(attention);
  const loadError = tasksResult.error || interviewsResult.error || opportunitiesResult.error || activeCountResult.error || jobsResult.error || contactsResult.error;

  return <div className="workspace-page home-v2-page">
    <WorkspaceHeader
      title="Home"
      context={<><span>{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now)}</span><span aria-hidden="true"> · </span><span>{context.project.name}</span></>}
      actions={<CreateJobButton variant="ghost" size="sm"><Plus data-icon="inline-start" aria-hidden="true" />Add job</CreateJobButton>}
      className="home-v2-header"
    />

    {query.error ? <Alert variant="destructive" className="home-notice"><AlertTitle>Home could not be updated</AlertTitle><AlertDescription>{query.error}</AlertDescription></Alert> : null}
    {loadError ? <Alert variant="destructive" className="home-notice"><AlertTitle>Some items could not be loaded</AlertTitle><AlertDescription>Refresh the page to try again.</AlertDescription></Alert> : null}
    {query.welcome ? <Alert className="home-notice"><CheckCircle2 aria-hidden="true" /><AlertTitle>{context.project.name} is ready</AlertTitle><AlertDescription>Add a promising Job, review it in this Workspace’s Inbox, then track it when it deserves your attention.</AlertDescription><AlertAction><CreateJobButton size="sm">Add a job</CreateJobButton></AlertAction></Alert> : null}
    {query.projectCreated ? <Alert className="home-notice"><CheckCircle2 aria-hidden="true" /><AlertTitle>Workspace created</AlertTitle><AlertDescription>{context.project.name} now has its own preferences, Opportunities, documents, and results.</AlertDescription><AlertAction><CreateJobButton size="sm">Add the first job</CreateJobButton></AlertAction></Alert> : null}
    {query.projectArchived ? <Alert className="home-notice" role="status"><CheckCircle2 aria-hidden="true" /><AlertTitle>Workspace archived</AlertTitle><AlertDescription>You are now in {context.project.name}.</AlertDescription></Alert> : null}

    {query.workspaceSaved ? <Alert className="home-notice"><CheckCircle2 aria-hidden="true" /><AlertTitle>Workspace details updated</AlertTitle><AlertDescription>Your Home overview now reflects this search direction.</AlertDescription></Alert> : null}

    <div className="home-v2-layout">
      <main className="home-focus-panel">
        <HomeWorkspaceOverview project={context.project} />
        <header className="home-section-header"><div><h2>Next up</h2><span>{attention.length} items</span></div><p>Actions, follow-ups, and interviews that can move this Workspace forward.</p></header>
        {attention.length === 0 ? <Empty className="home-clear-state"><EmptyHeader><EmptyMedia className="home-empty-media"><CheckCircle2 aria-hidden="true" /></EmptyMedia><EmptyTitle>Nothing needs attention</EmptyTitle><EmptyDescription>Your follow-ups, preparation, interviews, and Inbox are clear.</EmptyDescription></EmptyHeader><EmptyContent><CreateJobButton variant="outline">Add a job</CreateJobButton></EmptyContent></Empty> : <div className="home-action-groups" aria-label="Items needing attention">{attentionGroups.map((group) => <WorkspaceListGroup title={group.label} count={group.items.length} className={`home-group home-group-${group.label.toLowerCase()}`} key={group.label}><div className="home-action-list">{group.items.map((item) => <AttentionRow item={item} group={group.label} key={`${item.kind}-${item.id}`} />)}</div></WorkspaceListGroup>)}</div>}
      </main>

      <aside className="home-context-rail">
        <HomeWorkspaceDetails project={context.project} />
        <section className="home-pulse" aria-labelledby="workspace-pulse-heading">
          <div className="home-rail-heading"><h2 id="workspace-pulse-heading">Workspace pulse</h2></div>
          <dl>
            <div><dt>Due tasks</dt><dd>{tasks.length}</dd></div>
            <div><dt>Interviews this week</dt><dd>{interviews.length}</dd></div>
            <div><dt>Active opportunities</dt><dd>{activeCount}</dd></div>
            <div><dt>Jobs to review</dt><dd>{inboxCount}</dd></div>
          </dl>
        </section>

        <section className="home-active-opportunities" aria-labelledby="active-opportunities-heading">
          <div className="home-rail-heading"><h2 id="active-opportunities-heading">Active opportunities</h2><Link href="/opportunities">View all</Link></div>
          <div className="home-opportunity-list">{opportunities.slice(0, 5).map((opportunity) => <Link href={`/opportunities/${opportunity.id}`} key={opportunity.id}><span className="status-dot" /><span><strong>{opportunity.jobs?.title ?? "Untitled role"}</strong><small>{opportunity.jobs?.company ?? "Unknown company"} · {stageLabel(opportunity.stage)}</small></span><ArrowRight aria-hidden="true" /></Link>)}</div>
          {opportunities.length === 0 ? <p className="empty-inline">Track a Job to create this Workspace’s first Opportunity.</p> : null}
        </section>
      </aside>
    </div>
  </div>;
}

function AttentionRow({ item, group }: { item: AttentionItem; group: string }) {
  const icon = item.kind === "interview" ? <CalendarClock aria-hidden="true" /> : item.kind === "inbox" ? <Inbox aria-hidden="true" /> : item.kind === "contact" ? <UserRound aria-hidden="true" /> : <Target aria-hidden="true" />;
  const copy = <><strong>{item.title}</strong><small>{item.meta}</small></>;

  if (item.kind === "task") return <article className="home-action-row home-task-row" data-group={group.toLowerCase()}> 
    <time>{item.dateLabel}</time>
    <form className="home-action-complete" action={toggleTask}><input type="hidden" name="taskId" value={item.id} /><input type="hidden" name="opportunityId" value={item.opportunityId ?? ""} /><input type="hidden" name="status" value="done" /><Button variant="ghost" size="icon-sm" aria-label={`Complete ${item.title}`} data-tooltip="Mark complete"><Circle data-icon="inline-start" aria-hidden="true" /></Button></form>
    {item.opportunityId ? <Link className="home-action-copy" href={`/opportunities/${item.opportunityId}`}>{copy}</Link> : <span className="home-action-copy">{copy}</span>}
  </article>;

  const href = item.kind === "inbox" ? "/inbox" : item.kind === "contact" && !item.opportunityId ? "/opportunities" : `/opportunities/${item.opportunityId}`;
  return <Link className="home-action-row home-action-row-link" data-group={group.toLowerCase()} href={href}><time>{item.dateLabel}</time><span className="home-action-icon">{icon}</span><span className="home-action-copy">{copy}</span><ArrowRight className="home-action-arrow" aria-hidden="true" /></Link>;
}

function buildAttentionItems({ interviews, tasks, opportunities, contacts, inboxCount, now, ticketKey }: { interviews: Array<{ id: string; interview_type: string; starts_at: string; timezone: string; opportunity_id: string; opportunities: unknown }>; tasks: Array<{ id: string; title: string; due_at: string | null; opportunity_id: string | null; opportunities: unknown }>; opportunities: ActiveOpportunity[]; contacts: Array<{ id: string; name: string; company: string; role: string; follow_up_at: string | null; opportunity_id: string | null }>; inboxCount: number; now: Date; ticketKey: string }) {
  const items: AttentionItem[] = [];
  const taskActionKeys = new Set<string>();
  interviews.forEach((interview) => {
    const relation = interview.opportunities as OpportunityRelation;
    items.push({ kind: "interview", id: interview.id, timestamp: new Date(interview.starts_at).getTime(), dateLabel: new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: interview.timezone }).format(new Date(interview.starts_at)).replace(",", " ·"), title: `Prepare for ${interview.interview_type}`, meta: relation?.jobs ? `${relation.jobs.company} · ${relation.jobs.title}` : "Upcoming interview", opportunityId: interview.opportunity_id });
  });
  tasks.forEach((task) => {
    const relation = task.opportunities as OpportunityRelation;
    items.push({ kind: "task", id: task.id, timestamp: task.due_at ? new Date(task.due_at).getTime() : now.getTime(), dateLabel: task.due_at ? relativeDate(task.due_at, now) : "Task", title: task.title, meta: relation?.jobs ? `${relation.jobs.company} · ${relation.jobs.title}` : "Workspace task", opportunityId: task.opportunity_id });
    if (task.opportunity_id) taskActionKeys.add(`${task.opportunity_id}:${task.title.trim().toLowerCase()}`);
  });
  contacts.forEach((contact) => {
    if (!contact.follow_up_at) return;
    items.push({ kind: "contact", id: contact.id, timestamp: new Date(contact.follow_up_at).getTime(), dateLabel: relativeDate(contact.follow_up_at, now), title: `Follow up with ${contact.name}`, meta: [contact.role, contact.company].filter(Boolean).join(" · ") || "Workspace contact", opportunityId: contact.opportunity_id });
  });
  opportunities.forEach((opportunity) => {
    const duplicatesTask = opportunity.next_action ? taskActionKeys.has(`${opportunity.id}:${opportunity.next_action.trim().toLowerCase()}`) : false;
    if (opportunity.next_action && opportunity.next_action_due_at && !duplicatesTask) {
      items.push({ kind: "action", id: opportunity.id, timestamp: new Date(opportunity.next_action_due_at).getTime(), dateLabel: relativeDate(opportunity.next_action_due_at, now), title: opportunity.next_action, meta: opportunity.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : formatOpportunityTicket(ticketKey, opportunity.reference_number), opportunityId: opportunity.id });
    } else if (opportunity.next_action && !duplicatesTask) {
      items.push({ kind: "action", id: opportunity.id, timestamp: now.getTime() + 1, dateLabel: "Next", title: opportunity.next_action, meta: opportunity.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : formatOpportunityTicket(ticketKey, opportunity.reference_number), opportunityId: opportunity.id });
    } else if (!opportunity.next_action) {
      items.push({ kind: "action", id: opportunity.id, timestamp: now.getTime() + 1, dateLabel: "Review", title: "Choose a Next Action", meta: opportunity.jobs ? `${opportunity.jobs.company} · ${opportunity.jobs.title}` : formatOpportunityTicket(ticketKey, opportunity.reference_number), opportunityId: opportunity.id });
    }
  });
  if (inboxCount > 0) items.push({ kind: "inbox", id: "inbox", timestamp: Number.MAX_SAFE_INTEGER, dateLabel: "Inbox", title: `Review ${inboxCount} ${inboxCount === 1 ? "job" : "jobs"}`, meta: "Decide what deserves to become an Opportunity." });
  return items.sort((a, b) => a.timestamp - b.timestamp).slice(0, 12);
}

function relativeDate(value: string, now: Date) {
  const date = new Date(value);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((target - start) / 86_400_000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function groupAttentionItems(items: AttentionItem[]) {
  const groups = [
    { label: "Overdue", items: items.filter((item) => item.dateLabel === "Overdue") },
    { label: "Today", items: items.filter((item) => item.dateLabel === "Today") },
    { label: "Upcoming", items: items.filter((item) => !["Overdue", "Today", "Inbox"].includes(item.dateLabel) && item.kind !== "inbox") },
    { label: "Inbox", items: items.filter((item) => item.kind === "inbox") },
  ];
  return groups.filter((group) => group.items.length > 0);
}

function stageLabel(stage: string) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
