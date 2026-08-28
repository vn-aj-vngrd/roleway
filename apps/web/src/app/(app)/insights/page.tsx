import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";

type ApplicationInsight = { opportunity_id: string; submitted_at: string; opportunities: { stage: string; jobs: { source: string } | null } | null };
type SourceRow = { source: string; applications: number; interviews: number };

export default async function InsightsPage() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const now = new Date();
  const since = new Date(now); since.setDate(since.getDate() - 30);
  const [jobsResult, applicationsResult, interviewsResult, opportunitiesResult] = await Promise.all([
    context.supabase.from("jobs").select("id, imported_at").eq("user_id", context.user.id).gte("imported_at", since.toISOString()),
    context.supabase.from("application_records").select("opportunity_id, submitted_at, opportunities(stage, jobs(source))").eq("user_id", context.user.id).gte("submitted_at", since.toISOString()).order("submitted_at"),
    context.supabase.from("interviews").select("id, opportunity_id, starts_at, status").eq("user_id", context.user.id).gte("starts_at", since.toISOString()),
    context.supabase.from("opportunities").select("id, stage, closed_reason, created_at, updated_at").eq("user_id", context.user.id),
  ]);
  const applications = (applicationsResult.data ?? []) as unknown as ApplicationInsight[];
  const interviews = interviewsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const interviewOpportunityIds = new Set(interviews.map((item) => item.opportunity_id));
  const applicationsWithInterview = applications.filter((item) => interviewOpportunityIds.has(item.opportunity_id)).length;
  const offers = opportunities.filter((item) => new Date(item.updated_at) >= since && (item.stage === "offer" || item.closed_reason === "Accepted")).length;
  const sourceRows = buildSourceRows(applications, interviewOpportunityIds);
  const enoughData = applications.length >= 3;
  const activeAges = opportunities.filter((item) => item.stage !== "closed").map((item) => Math.max(0, Math.floor((now.getTime() - new Date(item.updated_at).getTime()) / 86_400_000)));
  const averageAge = activeAges.length ? Math.round(activeAges.reduce((sum, days) => sum + days, 0) / activeAges.length) : 0;
  const error = jobsResult.error || applicationsResult.error || interviewsResult.error || opportunitiesResult.error;

  return <div className="page narrow"><PageHeader title="Insights" description={<>All workspaces · last 30 days, calculated from recorded activity only.</>} />{error ? <div className="form-alert error" role="alert">Insights could not be calculated. Refresh to try again.</div> : null}<section className="insight-summary-strip" aria-label="Account summary"><div><strong>{jobsResult.data?.length ?? 0}</strong><span>Jobs captured</span></div><div><strong>{applications.length}</strong><span>Applications submitted</span></div><div><strong>{applicationsWithInterview}</strong><span>Applications with an interview</span></div><div><strong>{offers}</strong><span>Offers recorded</span></div></section>{enoughData ? <><section className="conversion-table"><div className="content-section-head"><div><h2>Pipeline conversion</h2><p className="page-subtitle">Directional rates from recorded submissions and interviews—not a prediction of future outcomes.</p></div></div><div className="conversion-row"><span>Application → interview</span><strong className="mono">{Math.round((applicationsWithInterview / applications.length) * 100)}%</strong><div className="progress"><span style={{ width: `${Math.round((applicationsWithInterview / applications.length) * 100)}%` }} /></div></div><div className="conversion-row"><span>Average inactive age</span><strong className="mono">{averageAge}d</strong><p>Days since the last update across active Opportunities.</p></div></section>{sourceRows.length ? <section className="source-effectiveness"><div className="content-section-head"><div><h2>Source outcomes</h2><p className="page-subtitle">Small samples are shown as counts so they are not mistaken for proof that a source caused the outcome.</p></div></div><div className="source-table" role="table" aria-label="Applications and interviews by source"><div role="row" className="source-table-row header"><span role="columnheader">Source</span><span role="columnheader">Applications</span><span role="columnheader">With interview</span></div>{sourceRows.map((row) => <div role="row" className="source-table-row" key={row.source}><strong role="cell">{row.source}</strong><span role="cell">{row.applications}</span><span role="cell">{row.interviews}</span></div>)}</div></section> : null}</> : <div className="empty-state"><span className="empty-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><h2>More recorded applications are needed</h2><p>Roleway waits for at least three submissions across your workspaces before showing conversion rates. Counts above remain factual; a rate from a smaller sample would imply more confidence than the data supports.</p></div>}</div>;
}

function buildSourceRows(applications: ApplicationInsight[], interviewOpportunityIds: Set<string>): SourceRow[] {
  const rows = new Map<string, SourceRow>();
  for (const application of applications) {
    const source = application.opportunities?.jobs?.source || "Unknown";
    const row = rows.get(source) ?? { source, applications: 0, interviews: 0 };
    row.applications += 1;
    if (interviewOpportunityIds.has(application.opportunity_id)) row.interviews += 1;
    rows.set(source, row);
  }
  return [...rows.values()].sort((left, right) => right.applications - left.applications || left.source.localeCompare(right.source));
}
