import { formatOpportunityTicket } from "@roleway/core";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectionViewControls } from "@/components/collection-view-controls";
import { CreateModal } from "@/components/create-modal";
import {
  DateTimeField,
  SelectField,
  TimezoneField,
} from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  CountBadge,
  EmptyState,
  PillTabs,
  ViewToolbar,
  WorkspaceHeader,
  WorkspaceListGroup,
} from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { createInterview } from "@/features/workspace/actions";

type OpportunityOption = {
  id: string;
  reference_number: number;
  jobs: { company: string; title: string } | null;
};

type InterviewRow = {
  id: string;
  interview_type: string;
  starts_at: string;
  duration_minutes: number | null;
  timezone: string;
  status: string;
  opportunity_id: string;
  preparation_notes: string;
  questions_to_ask: string;
  interviewers: string;
  opportunities: {
    reference_number: number;
    jobs: { company: string; title: string } | null;
  } | null;
};

export default async function PreparationPage(props: {
  searchParams: Promise<{
    create?: string;
    opportunity?: string;
    error?: string;
    deleted?: string;
    range?: string;
    type?: string;
    status?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([
    requireSearchContext(),
    searchParams,
  ]);
  if (!context) redirect("/login");
  const project = context.project;
  if (!project) redirect("/onboarding");

  const [interviewsResult, opportunitiesResult] = await Promise.all([
    context.supabase
      .from("interviews")
      .select(
        "id, interview_type, starts_at, duration_minutes, timezone, status, opportunity_id, preparation_notes, questions_to_ask, interviewers, opportunities(reference_number, jobs(company, title))",
      )
      .eq("project_id", project.id)
      .order("starts_at", { ascending: true }),
    context.supabase
      .from("opportunities")
      .select("id, reference_number, jobs(company, title)")
      .eq("project_id", project.id)
      .neq("stage", "closed")
      .order("updated_at", { ascending: false }),
  ]);

  const opportunities = (opportunitiesResult.data ??
    []) as unknown as OpportunityOption[];
  const interviews = (interviewsResult.data ?? []) as unknown as InterviewRow[];
  const now = Date.now();
  const upcoming = interviews.filter(
    (item) =>
      item.status === "scheduled" && new Date(item.starts_at).getTime() >= now,
  );
  const history = interviews
    .filter((item) => !upcoming.includes(item))
    .reverse();
  const interviewsThisWeek = upcoming.filter(
    (item) => new Date(item.starts_at).getTime() <= now + 7 * 86_400_000,
  );
  const weekFilter = query.range === "week";
  const historyFilter = query.range === "history";
  const interviewTypes = [
    ...new Set(interviews.map((interview) => interview.interview_type)),
  ].sort();
  const type = interviewTypes.includes(query.type ?? "") ? query.type! : "all";
  const interviewStatuses = [
    "all",
    "scheduled",
    "completed",
    "cancelled",
  ] as const;
  const status = interviewStatuses.includes(
    query.status as (typeof interviewStatuses)[number],
  )
    ? query.status!
    : "all";
  const interviewSorts = ["schedule", "oldest", "newest"] as const;
  const sort = interviewSorts.includes(
    query.sort as (typeof interviewSorts)[number],
  )
    ? query.sort!
    : "schedule";
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  const baseInterviews = historyFilter
    ? history
    : weekFilter
      ? interviewsThisWeek
      : upcoming;
  const visibleInterviews = baseInterviews
    .filter((interview) => {
      if (type !== "all" && interview.interview_type !== type) return false;
      if (status !== "all" && interview.status !== status) return false;
      if (!normalizedQuery) return true;
      return [
        interview.interview_type,
        interview.interviewers,
        interview.opportunities?.jobs?.company,
        interview.opportunities?.jobs?.title,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      if (sort === "oldest")
        return (
          new Date(left.starts_at).getTime() -
          new Date(right.starts_at).getTime()
        );
      if (sort === "newest")
        return (
          new Date(right.starts_at).getTime() -
          new Date(left.starts_at).getTime()
        );
      return historyFilter
        ? new Date(right.starts_at).getTime() -
            new Date(left.starts_at).getTime()
        : new Date(left.starts_at).getTime() -
            new Date(right.starts_at).getTime();
    });
  const visibleGroupTitle = historyFilter
    ? "History"
    : weekFilter
      ? "This week"
      : "Upcoming";
  const selectedOpportunityId = opportunities.some(
    (item) => item.id === query.opportunity,
  )
    ? query.opportunity
    : opportunities[0]?.id;
  const loadError = interviewsResult.error || opportunitiesResult.error;

  return (
    <div className="workspace-page workspace-index-page interview-index-page">
      <WorkspaceHeader
        title="Interviews"
        count={visibleInterviews.length}
        context={
          <>Scheduled conversations and preparation for {project.name}.</>
        }
        actions={
          opportunities.length ? (
            <Link className="button primary" href="/interview?create=true">
              <Plus aria-hidden="true" />
              Add interview
            </Link>
          ) : null
        }
      />

      <ViewToolbar
        className="interview-view-toolbar"
        label="Interview views"
        primary={
          <PillTabs
            label="Interview views"
            items={[
              {
                href: "/interview",
                label: "Upcoming",
                active: !weekFilter && !historyFilter,
                count: upcoming.length,
              },
              {
                href: "/interview?range=week",
                label: "Next 7 days",
                active: weekFilter,
                count: interviewsThisWeek.length,
              },
              {
                href: "/interview?range=history",
                label: "History",
                active: historyFilter,
                count: history.length,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="interviews"
            filterGroups={[
              {
                key: "type",
                label: "Interview type",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All types" },
                  ...interviewTypes.map((value) => ({ value, label: value })),
                ],
              },
              {
                key: "status",
                label: "Status",
                defaultValue: "all",
                options: [
                  { value: "all", label: "Any status" },
                  { value: "scheduled", label: "Scheduled" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ],
              },
            ]}
            values={{ type, status }}
            sort={sort}
            defaultSort="schedule"
            sortOptions={[
              { value: "schedule", label: "Schedule order" },
              { value: "oldest", label: "Oldest first" },
              { value: "newest", label: "Newest first" },
            ]}
            search={{
              key: "q",
              value: query.q ?? "",
              placeholder: "Search conversations…",
            }}
          />
        }
      />

      {query.error || query.deleted || loadError ? (
        <div className="interview-notices">
          {query.error ? (
            <div className="form-alert error" role="alert">
              {query.error}
            </div>
          ) : null}
          {query.deleted ? (
            <div className="form-alert success" role="status">
              Interview deleted.
            </div>
          ) : null}
          {loadError ? (
            <div className="form-alert error" role="alert">
              Some interview context could not be loaded. Refresh to try again.
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={`interview-index-layout${interviewsResult.error ? " no-rail" : ""}`}
      >
        <main className="interview-schedule">
          <header className="interview-schedule-header">
            <div>
              <h2>
                {historyFilter
                  ? "Interview history"
                  : weekFilter
                    ? "Interviews in the next 7 days"
                    : "Upcoming interviews"}
              </h2>
              <p>
                Open a conversation to prepare, capture notes, and record what
                happens next.
              </p>
            </div>
            <span>
              {visibleInterviews.length}{" "}
              {visibleInterviews.length === 1
                ? "conversation"
                : "conversations"}
            </span>
          </header>

          {interviewsResult.error ? (
            <EmptyState
              className="interview-empty-state"
              title="Interviews could not be loaded"
              description="Refresh this page to recover the schedule. Your saved interview records have not been changed."
            />
          ) : interviews.length === 0 ? (
            <EmptyState
              className="interview-empty-state"
              icon={<CalendarClock />}
              title="No interviews in this workspace"
              description="When a conversation is booked, add it here. Roleway will create a preparation task, surface it on Home, and keep the notes with the Opportunity."
              actions={
                opportunities.length === 0 ? (
                  <Link className="button primary" href="/inbox?create=true">
                    Add a job first
                  </Link>
                ) : (
                  <Link
                    className="button primary"
                    href="/interview?create=true"
                  >
                    <Plus aria-hidden="true" />
                    Add interview
                  </Link>
                )
              }
            />
          ) : (
            <div className="interview-groups">
              {visibleInterviews.length ? (
                <InterviewGroup
                  title={visibleGroupTitle}
                  interviews={visibleInterviews}
                  ticketKey={project.ticket_key}
                />
              ) : (
                <WorkspaceListGroup
                  title={visibleGroupTitle}
                  count={0}
                  className="interview-group"
                >
                  <p className="empty-inline">
                    {historyFilter
                      ? "No past conversations are recorded."
                      : weekFilter
                        ? "No interviews are scheduled in the next 7 days."
                        : "No upcoming conversations."}
                  </p>
                </WorkspaceListGroup>
              )}
            </div>
          )}
        </main>

        {!interviewsResult.error ? (
          <InterviewInsights
            upcoming={upcoming}
            history={history}
            interviewsThisWeek={interviewsThisWeek.length}
            canCreate={opportunities.length > 0}
          />
        ) : null}
      </div>

      {query.create && !opportunities.length ? (
        <CreateModal
          title="Add an Opportunity first"
          description="Interviews stay attached to the Opportunity they belong to."
          context={project.name}
          closeHref="/interview"
          size="compact"
        >
          <div className="modal-create-form">
            <div className="composer-editor">
              <h1 className="composer-static-title">No active Opportunities</h1>
              <p className="composer-placeholder">
                Add a Job, review it in the Inbox, and track it before
                scheduling an interview.
              </p>
            </div>
            <footer className="composer-footer">
              <Link className="button secondary" href="/interview">
                Cancel
              </Link>
              <Link className="button primary" href="/inbox?create=true">
                Add a Job
              </Link>
            </footer>
          </div>
        </CreateModal>
      ) : null}

      {query.create && opportunities.length ? (
        <CreateModal
          title="Add an interview"
          description="Schedule the conversation against its Opportunity so preparation stays attached."
          context={project.name}
          closeHref="/interview"
        >
          <form
            action={createInterview}
            className="modal-create-form linear-composer"
          >
            <div className="composer-editor">
              <h1 className="composer-static-title">Schedule an interview</h1>
              <p className="composer-placeholder">
                Roleway will attach the conversation, create a preparation task,
                and move the Opportunity into Interview.
              </p>
            </div>
            <div className="composer-properties composer-properties-stacked">
              <div className="composer-select-property">
                <span>Opportunity</span>
                <SelectField
                  id="opportunityId"
                  name="opportunityId"
                  required
                  defaultValue={selectedOpportunityId}
                  ariaLabel="Opportunity"
                  options={opportunities.map((opportunity) => ({
                    value: opportunity.id,
                    label: `${formatOpportunityTicket(project.ticket_key, opportunity.reference_number)} · ${opportunity.jobs?.company ?? "Unknown company"} · ${opportunity.jobs?.title ?? "Untitled role"}`,
                  }))}
                />
              </div>
              <div className="composer-select-property">
                <span>Type</span>
                <SelectField
                  id="interviewType"
                  name="interviewType"
                  defaultValue="Recruiter screen"
                  ariaLabel="Interview type"
                  options={[
                    "Recruiter screen",
                    "Hiring manager",
                    "Technical interview",
                    "Coding interview",
                    "Behavioral interview",
                    "System design",
                    "Take-home review",
                    "Panel interview",
                    "Final interview",
                  ].map((label) => ({ value: label, label }))}
                />
              </div>
              <div className="composer-select-property">
                <span>Starts</span>
                <DateTimeField id="startsAt" name="startsAt" required />
              </div>
              <div className="composer-select-property">
                <span>Duration</span>
                <SelectField
                  id="durationMinutes"
                  name="durationMinutes"
                  defaultValue="60"
                  ariaLabel="Interview duration"
                  options={[15, 30, 45, 60, 90, 120, 180].map((minutes) => ({
                    value: String(minutes),
                    label: `${minutes} minutes`,
                  }))}
                />
              </div>
              <label className="composer-property composer-property-wide">
                <span>Timezone</span>
                <TimezoneField id="timezone" className="" />
              </label>
              <label className="composer-property composer-property-wide">
                <span>Meeting URL</span>
                <input
                  id="meetingUrl"
                  name="meetingUrl"
                  type="url"
                  placeholder="https://…"
                />
              </label>
              <label className="composer-property composer-property-wide">
                <span>Interviewers</span>
                <input
                  id="interviewers"
                  name="interviewers"
                  placeholder="Names and roles, if known"
                />
              </label>
            </div>
            <footer className="composer-footer">
              <span className="composer-save-note">
                The interview and preparation task will appear on Home.
              </span>
              <Link className="button secondary" href="/interview">
                Cancel
              </Link>
              <SubmitButton pendingLabel="Scheduling…">
                Add interview
              </SubmitButton>
            </footer>
          </form>
        </CreateModal>
      ) : null}
    </div>
  );
}

function InterviewGroup({
  title,
  interviews,
  ticketKey,
}: {
  title: string;
  interviews: InterviewRow[];
  ticketKey: string;
}) {
  return (
    <WorkspaceListGroup
      title={title}
      count={interviews.length}
      className="interview-group"
    >
      <div className="document-list interview-list">
        {interviews.map((interview) => {
          const opportunity = interview.opportunities;
          const date = interviewDateParts(interview);
          const ticket = opportunity
            ? formatOpportunityTicket(ticketKey, opportunity.reference_number)
            : "Opportunity";
          return (
            <Link
              className="list-row list-row-link interview-list-row"
              href={`/interview/${interview.id}`}
              key={interview.id}
            >
              <span className="interview-date-mark" aria-hidden="true">
                <span>{date.month}</span>
                <strong>{date.day}</strong>
              </span>
              <span className="interview-list-copy">
                <strong>{interview.interview_type}</strong>
                <span>
                  {ticket} · {opportunity?.jobs?.company ?? "Unknown company"} ·{" "}
                  {opportunity?.jobs?.title ?? "Untitled role"}
                </span>
              </span>
              <time
                className="interview-list-time"
                dateTime={interview.starts_at}
                aria-label={date.full}
              >
                <strong>{date.time}</strong>
                <span>{date.zone}</span>
              </time>
              <Badge
                variant="secondary"
                className="interview-status-badge"
                data-status={interview.status}
              >
                {statusLabel(interview.status)}
              </Badge>
              <ChevronRight aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </WorkspaceListGroup>
  );
}

function InterviewInsights({
  upcoming,
  history,
  interviewsThisWeek,
  canCreate,
}: {
  upcoming: InterviewRow[];
  history: InterviewRow[];
  interviewsThisWeek: number;
  canCreate: boolean;
}) {
  const nextInterview = upcoming[0];
  const nextDate = nextInterview ? interviewDateParts(nextInterview) : null;
  const nextOpportunity = nextInterview?.opportunities;
  const checks = nextInterview
    ? [
        {
          label: "Preparation plan",
          complete: Boolean(nextInterview.preparation_notes.trim()),
        },
        {
          label: "Questions to ask",
          complete: Boolean(nextInterview.questions_to_ask.trim()),
        },
        {
          label: "Interviewers",
          complete: Boolean(nextInterview.interviewers.trim()),
        },
      ]
    : [];

  return (
    <aside className="interview-insights-rail" aria-label="Interview insights">
      <section aria-labelledby="schedule-insights-heading">
        <header className="interview-rail-heading">
          <h2 id="schedule-insights-heading">Schedule insights</h2>
        </header>
        <dl className="interview-insight-list">
          <div>
            <dt>Next 7 days</dt>
            <dd>
              <CountBadge value={interviewsThisWeek} />
            </dd>
          </div>
          <div>
            <dt>Upcoming</dt>
            <dd>
              <CountBadge value={upcoming.length} />
            </dd>
          </div>
          <div>
            <dt>History</dt>
            <dd>
              <CountBadge value={history.length} />
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="next-interview-heading">
        <header className="interview-rail-heading">
          <h2 id="next-interview-heading">Next conversation</h2>
        </header>
        {nextInterview && nextDate ? (
          <Link
            className="interview-next-link"
            href={`/interview/${nextInterview.id}`}
          >
            <span className="interview-next-date">
              <CalendarClock aria-hidden="true" />
              <span>{nextDate.full}</span>
            </span>
            <strong>{nextInterview.interview_type}</strong>
            <span>
              {nextOpportunity?.jobs?.company ?? "Unknown company"} ·{" "}
              {nextOpportunity?.jobs?.title ?? "Untitled role"}
            </span>
            <span className="interview-next-action">
              Open preparation <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <div className="interview-rail-empty">
            <p>No upcoming interviews are scheduled.</p>
            {canCreate ? (
              <Link href="/interview?create=true">
                Add the next conversation <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        )}
      </section>

      {nextInterview ? (
        <section aria-labelledby="preparation-check-heading">
          <header className="interview-rail-heading">
            <h2 id="preparation-check-heading">Preparation check</h2>
            <span>
              {checks.filter((check) => check.complete).length} of{" "}
              {checks.length}
            </span>
          </header>
          <ul className="interview-preparation-checks">
            {checks.map((check) => (
              <li data-complete={check.complete || undefined} key={check.label}>
                {check.complete ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
                <span>{check.label}</span>
                <small>{check.complete ? "Added" : "Not added"}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function interviewDateParts(
  interview: Pick<InterviewRow, "starts_at" | "timezone">,
) {
  const date = new Date(interview.starts_at);
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: interview.timezone,
    timeZoneName: "short",
  }).formatToParts(date);
  const zone =
    timeParts.find((part) => part.type === "timeZoneName")?.value ??
    interview.timezone;
  const time = timeParts
    .filter((part) => part.type !== "timeZoneName")
    .map((part) => part.value)
    .join("")
    .trim();

  return {
    month: new Intl.DateTimeFormat(undefined, {
      month: "short",
      timeZone: interview.timezone,
    }).format(date),
    day: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      timeZone: interview.timezone,
    }).format(date),
    time,
    zone,
    full: new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: interview.timezone,
      timeZoneName: "short",
    }).format(date),
  };
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
