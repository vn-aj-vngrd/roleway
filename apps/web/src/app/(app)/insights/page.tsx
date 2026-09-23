import type { CSSProperties } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  CircleMinus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InsightsRangeSelect } from "@/components/insights-range-select";
import { PageHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";

type RangeKey = "30" | "90" | "180" | "365";
type ApplicationInsight = {
  opportunity_id: string;
  project_id: string;
  submitted_at: string;
  opportunities: {
    stage: string;
    closed_reason: string | null;
    jobs: { source: string } | null;
  } | null;
};
type JobInsight = { id: string; project_id: string; imported_at: string };
type InterviewInsight = {
  id: string;
  opportunity_id: string;
  project_id: string;
  starts_at: string;
  status: string;
};
type OpportunityInsight = {
  id: string;
  project_id: string;
  stage: string;
  closed_reason: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  updated_at: string;
};
type StageEvent = {
  opportunity_id: string;
  created_at: string;
  payload: unknown;
};
type SourceRow = { source: string; applications: number; interviews: number };
type ActivityBucket = {
  label: string;
  jobs: number;
  applications: number;
  interviews: number;
};

type InsightsPageProps = {
  searchParams: Promise<{ range?: string | string[] }>;
};

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
];

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const query = await searchParams;
  const requestedRange = Array.isArray(query.range) ? query.range[0] : query.range;
  const range = RANGE_OPTIONS.some((option) => option.value === requestedRange)
    ? (requestedRange as RangeKey)
    : "30";
  const rangeOption = RANGE_OPTIONS.find((option) => option.value === range)!;
  const now = new Date();
  const since = new Date(now.getTime() - Number(range) * 86_400_000);

  const [jobsResult, applicationsResult, interviewsResult, opportunitiesResult, eventsResult] =
    await Promise.all([
      context.supabase
        .from("jobs")
        .select("id, project_id, imported_at")
        .eq("user_id", context.user.id)
        .gte("imported_at", since.toISOString())
        .order("imported_at"),
      context.supabase
        .from("application_records")
        .select(
          "opportunity_id, project_id, submitted_at, opportunities(stage, closed_reason, jobs(source))",
        )
        .eq("user_id", context.user.id)
        .gte("submitted_at", since.toISOString())
        .order("submitted_at"),
      context.supabase
        .from("interviews")
        .select("id, opportunity_id, project_id, starts_at, status")
        .eq("user_id", context.user.id)
        .order("starts_at"),
      context.supabase
        .from("opportunities")
        .select(
          "id, project_id, stage, closed_reason, next_action, next_action_due_at, created_at, updated_at",
        )
        .eq("user_id", context.user.id),
      context.supabase
        .from("opportunity_events")
        .select("opportunity_id, created_at, payload")
        .eq("user_id", context.user.id)
        .eq("event_type", "stage_changed")
        .order("created_at"),
    ]);

  const jobs = (jobsResult.data ?? []) as JobInsight[];
  const applications = (applicationsResult.data ?? []) as unknown as ApplicationInsight[];
  const allInterviews = (interviewsResult.data ?? []) as InterviewInsight[];
  const opportunities = (opportunitiesResult.data ?? []) as OpportunityInsight[];
  const stageEvents = (eventsResult.data ?? []) as StageEvent[];
  const interviews = allInterviews.filter(
    (item) => item.status !== "cancelled" && new Date(item.starts_at) >= since && new Date(item.starts_at) <= now,
  );
  const interviewOpportunityIds = new Set(
    allInterviews.filter((item) => item.status !== "cancelled").map((item) => item.opportunity_id),
  );
  const offerOpportunityIds = new Set(
    stageEvents.filter((event) => eventDestination(event.payload) === "offer").map((event) => event.opportunity_id),
  );
  for (const opportunity of opportunities) {
    if (opportunity.stage === "offer" || opportunity.closed_reason === "Accepted") {
      offerOpportunityIds.add(opportunity.id);
    }
  }

  const applicationsWithInterview = applications.filter((item) =>
    interviewOpportunityIds.has(item.opportunity_id),
  ).length;
  const applicationsWithOffer = applications.filter((item) =>
    offerOpportunityIds.has(item.opportunity_id),
  ).length;
  const offersInRange = new Set(
    stageEvents
      .filter(
        (event) =>
          new Date(event.created_at) >= since &&
          new Date(event.created_at) <= now &&
          eventDestination(event.payload) === "offer",
      )
      .map((event) => event.opportunity_id),
  ).size;
  const sourceRows = buildSourceRows(applications, interviewOpportunityIds);
  const activity = buildActivityBuckets({ jobs, applications, interviews, since, now, range });
  const enoughData = applications.length >= 3;
  const activeOpportunities = opportunities.filter((item) => item.stage !== "closed");
  const missingNextAction = activeOpportunities.filter((item) => !item.next_action?.trim()).length;
  const overdueNextActions = activeOpportunities.filter(
    (item) => item.next_action_due_at && new Date(item.next_action_due_at) < now,
  ).length;
  const staleOpportunities = activeOpportunities.filter(
    (item) => now.getTime() - new Date(item.updated_at).getTime() >= 14 * 86_400_000,
  ).length;
  const currentHalfStart = new Date(now.getTime() - (Number(range) / 2) * 86_400_000);
  const currentHalfApplications = applications.filter(
    (item) => new Date(item.submitted_at) >= currentHalfStart,
  ).length;
  const priorHalfApplications = applications.length - currentHalfApplications;
  const momentum = comparePeriods(currentHalfApplications, priorHalfApplications);
  const workspaceRows = context.projects
    .map((project) => ({
      id: project.id,
      name: project.name,
      applications: applications.filter((item) => item.project_id === project.id).length,
      interviews: interviews.filter((item) => item.project_id === project.id).length,
    }))
    .filter((item) => item.applications || item.interviews)
    .sort(
      (left, right) =>
        right.applications - left.applications ||
        right.interviews - left.interviews ||
        left.name.localeCompare(right.name),
    );
  const error =
    jobsResult.error ||
    applicationsResult.error ||
    interviewsResult.error ||
    opportunitiesResult.error ||
    eventsResult.error;

  return (
    <div className="insights-page">
      <PageHeader
        title="Insights"
        description={`Account-wide activity across your Workspaces · ${rangeOption.label.toLowerCase()}.`}
        actions={<InsightsRangeSelect range={range} options={RANGE_OPTIONS} />}
      />

      {error ? (
        <div className="form-alert error" role="alert">
          Some insights could not be calculated. Refresh to try again.
        </div>
      ) : null}

      <div className="insights-layout">
        <main className="insights-main">
          <section className="insights-summary" aria-label="Activity summary">
            <SummaryValue value={jobs.length} label="Jobs captured" />
            <SummaryValue value={applications.length} label="Applications" />
            <SummaryValue value={interviews.length} label="Interviews held" />
            <SummaryValue value={offersInRange} label="Offers recorded" />
          </section>

          <section className="insight-section insight-signal" aria-labelledby="signal-title">
            <div className="insight-section-heading">
              <div>
                <h2 id="signal-title">Search signal</h2>
                <p>What changed inside the selected period.</p>
              </div>
            </div>
            <div className="signal-statement">
              <MomentumIcon direction={momentum.direction} />
              <div>
                <strong>{momentum.title}</strong>
                <p>{momentum.detail}</p>
              </div>
            </div>
          </section>

          <section className="insight-section" aria-labelledby="activity-title">
            <div className="insight-section-heading">
              <div>
                <h2 id="activity-title">Activity over time</h2>
                <p>Recorded Jobs, applications, and completed interview activity.</p>
              </div>
              <div className="activity-legend" aria-label="Chart legend">
                <span data-series="jobs">Jobs</span>
                <span data-series="applications">Applications</span>
                <span data-series="interviews">Interviews</span>
              </div>
            </div>
            <ActivityChart buckets={activity} />
          </section>

          <section className="insight-section" aria-labelledby="outcomes-title">
            <div className="insight-section-heading">
              <div>
                <h2 id="outcomes-title">Application outcomes</h2>
                <p>
                  Outcomes for applications submitted in this period, including later recorded progress.
                </p>
              </div>
            </div>
            {enoughData ? (
              <div className="outcome-funnel">
                <OutcomeRow
                  label="Applications submitted"
                  value={applications.length}
                  total={applications.length}
                />
                <OutcomeRow
                  label="Reached an interview"
                  value={applicationsWithInterview}
                  total={applications.length}
                />
                <OutcomeRow
                  label="Reached an offer"
                  value={applicationsWithOffer}
                  total={applications.length}
                />
              </div>
            ) : (
              <div className="insight-inline-empty">
                <ChartNoAxesColumnIncreasing aria-hidden="true" />
                <div>
                  <strong>More recorded applications are needed</strong>
                  <p>
                    Roleway waits for at least three submissions before showing conversion rates. Counts
                    remain visible without implying confidence the sample cannot support.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="insight-section" aria-labelledby="sources-title">
            <div className="insight-section-heading">
              <div>
                <h2 id="sources-title">Source outcomes</h2>
                <p>Counts show where recorded applications came from without claiming causation.</p>
              </div>
            </div>
            {sourceRows.length ? (
              <div className="insights-source-table" role="table" aria-label="Outcomes by source">
                <div role="row" className="insights-source-row header">
                  <span role="columnheader">Source</span>
                  <span role="columnheader">Applications</span>
                  <span role="columnheader">With interview</span>
                </div>
                {sourceRows.map((row) => (
                  <div role="row" className="insights-source-row" key={row.source}>
                    <strong role="cell">{row.source}</strong>
                    <span role="cell">{row.applications}</span>
                    <span role="cell">{row.interviews}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="insight-table-empty">No applications were recorded in this period.</p>
            )}
          </section>
        </main>

        <aside className="insights-rail" aria-label="Quick insight details">
          <section>
            <h2>Needs attention</h2>
            <dl className="insights-quick-list">
              <QuickValue label="Active Opportunities" value={activeOpportunities.length} />
              <QuickValue label="Missing a Next Action" value={missingNextAction} />
              <QuickValue label="Overdue Next Actions" value={overdueNextActions} />
              <QuickValue label="Inactive for 14+ days" value={staleOpportunities} />
            </dl>
            <Link href="/opportunities" className="insights-rail-link">
              Review active Workspace <ArrowRight aria-hidden="true" />
            </Link>
          </section>

          <section>
            <h2>Workspace activity</h2>
            {workspaceRows.length ? (
              <div className="workspace-insight-list">
                {workspaceRows.slice(0, 4).map((workspace) => (
                  <div key={workspace.id}>
                    <strong>{workspace.name}</strong>
                    <span>
                      {workspace.applications} application{workspace.applications === 1 ? "" : "s"} ·{" "}
                      {workspace.interviews} interview{workspace.interviews === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="insights-rail-empty">No application activity in this period.</p>
            )}
          </section>

          <section className="insights-method-note">
            <AlertCircle aria-hidden="true" />
            <div>
              <h2>How to read this</h2>
              <p>
                Insights use only activity recorded in Roleway. They describe your search history and do
                not predict hiring outcomes.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryValue({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function QuickValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function MomentumIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <ArrowUpRight aria-hidden="true" />;
  if (direction === "down") return <ArrowDownRight aria-hidden="true" />;
  return <CircleMinus aria-hidden="true" />;
}

function ActivityChart({ buckets }: { buckets: ActivityBucket[] }) {
  const largestTotal = Math.max(
    1,
    ...buckets.map((bucket) => bucket.jobs + bucket.applications + bucket.interviews),
  );
  return (
    <div className="activity-chart" role="img" aria-label="Activity counts over the selected timeline">
      {buckets.map((bucket) => {
        const total = bucket.jobs + bucket.applications + bucket.interviews;
        const chartStyle = {
          "--bucket-height": `${Math.max(total ? 12 : 2, (total / largestTotal) * 100)}%`,
        } as CSSProperties;
        return (
          <div
            className="activity-bucket"
            aria-label={`${bucket.label}: ${bucket.jobs} Jobs, ${bucket.applications} applications, ${bucket.interviews} interviews`}
            key={bucket.label}
          >
            <div className="activity-bar-track" style={chartStyle}>
              <div className="activity-bar" title={`${total} recorded activities`}>
                {bucket.interviews ? (
                  <span
                    data-series="interviews"
                    style={{ flexGrow: bucket.interviews }}
                    aria-hidden="true"
                  />
                ) : null}
                {bucket.applications ? (
                  <span
                    data-series="applications"
                    style={{ flexGrow: bucket.applications }}
                    aria-hidden="true"
                  />
                ) : null}
                {bucket.jobs ? (
                  <span data-series="jobs" style={{ flexGrow: bucket.jobs }} aria-hidden="true" />
                ) : null}
              </div>
            </div>
            <span>{bucket.label}</span>
            <small>{total}</small>
          </div>
        );
      })}
    </div>
  );
}

function OutcomeRow({ label, value, total }: { label: string; value: number; total: number }) {
  const rate = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="outcome-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="outcome-track" aria-label={`${label}: ${rate}%`}>
        <span style={{ width: `${rate}%` }} />
      </div>
      <small>{rate}%</small>
    </div>
  );
}

function buildSourceRows(
  applications: ApplicationInsight[],
  interviewOpportunityIds: Set<string>,
): SourceRow[] {
  const rows = new Map<string, SourceRow>();
  for (const application of applications) {
    const source = application.opportunities?.jobs?.source || "Unknown";
    const row = rows.get(source) ?? { source, applications: 0, interviews: 0 };
    row.applications += 1;
    if (interviewOpportunityIds.has(application.opportunity_id)) row.interviews += 1;
    rows.set(source, row);
  }
  return [...rows.values()].sort(
    (left, right) => right.applications - left.applications || left.source.localeCompare(right.source),
  );
}

function buildActivityBuckets({
  jobs,
  applications,
  interviews,
  since,
  now,
  range,
}: {
  jobs: JobInsight[];
  applications: ApplicationInsight[];
  interviews: InterviewInsight[];
  since: Date;
  now: Date;
  range: RangeKey;
}): ActivityBucket[] {
  const bucketCount = range === "30" ? 6 : range === "90" ? 13 : range === "180" ? 6 : 12;
  const duration = now.getTime() - since.getTime();
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: range === "30" || range === "90" ? "numeric" : undefined,
  });
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(since.getTime() + (duration * index) / bucketCount);
    return { label: formatter.format(start), jobs: 0, applications: 0, interviews: 0 };
  });
  const bucketIndex = (date: string) =>
    Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((new Date(date).getTime() - since.getTime()) / duration) * bucketCount)),
    );
  const increment = (date: string, field: "jobs" | "applications" | "interviews") => {
    const bucket = buckets[bucketIndex(date)];
    if (bucket) bucket[field] += 1;
  };
  for (const job of jobs) increment(job.imported_at, "jobs");
  for (const application of applications) increment(application.submitted_at, "applications");
  for (const interview of interviews) increment(interview.starts_at, "interviews");
  return buckets;
}

function comparePeriods(current: number, previous: number) {
  const periodLabel = "the prior half of this period";
  if (!current && !previous) {
    return {
      direction: "flat" as const,
      title: "No application activity yet",
      detail: "Record submissions to see whether your search pace is changing.",
    };
  }
  if (current === previous) {
    return {
      direction: "flat" as const,
      title: "Application pace held steady",
      detail: `${current} application${current === 1 ? "" : "s"} in each half of the selected period.`,
    };
  }
  if (!previous) {
    return {
      direction: "up" as const,
      title: "Application activity started recently",
      detail: `${current} application${current === 1 ? "" : "s"} in the latest half, after none in ${periodLabel}.`,
    };
  }
  const difference = Math.round((Math.abs(current - previous) / previous) * 100);
  const increased = current > previous;
  return {
    direction: increased ? ("up" as const) : ("down" as const),
    title: `Application pace ${increased ? "increased" : "decreased"} ${difference}%`,
    detail: `${current} in the latest half compared with ${previous} in ${periodLabel}.`,
  };
}

function eventDestination(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("to" in payload)) return null;
  return typeof payload.to === "string" ? payload.to : null;
}
