import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const since = new Date(); since.setDate(since.getDate() - 30);
  const [jobsResult, opportunitiesResult] = await Promise.all([
    auth.supabase.from("jobs").select("id, inbox_state, imported_at").gte("imported_at", since.toISOString()),
    auth.supabase.from("opportunities").select("id, stage, created_at").gte("created_at", since.toISOString()),
  ]);
  const jobs = jobsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const applications = opportunities.filter((item) => ["applied", "interview", "offer"].includes(item.stage)).length;
  const interviews = opportunities.filter((item) => ["interview", "offer"].includes(item.stage)).length;
  const offers = opportunities.filter((item) => item.stage === "offer").length;
  const enoughData = applications >= 3;

  return <div className="page narrow"><header className="page-header"><div className="page-header-copy"><h1>Insights</h1><p className="page-subtitle">Last 30 days · calculated from your actual Roleway activity.</p></div></header>{jobsResult.error || opportunitiesResult.error ? <div className="form-alert error">Insights could not be calculated.</div> : null}<section className="insight-grid" aria-label="Pipeline summary"><div className="metric"><div className="metric-value">{jobs.length}</div><div className="metric-label">Jobs reviewed</div></div><div className="metric"><div className="metric-value">{applications}</div><div className="metric-label">Applications in progress</div></div><div className="metric"><div className="metric-value">{interviews}</div><div className="metric-label">Interview-stage opportunities</div></div></section>{enoughData ? <section className="conversion-table"><div className="content-section-head"><div><h2>Pipeline conversion</h2><p className="page-subtitle">Directional rates based only on recorded stage changes.</p></div></div><div className="conversion-row"><span>Application → Interview</span><strong className="mono">{Math.round((interviews / applications) * 100)}%</strong><div className="progress"><span style={{ width: `${Math.round((interviews / applications) * 100)}%` }} /></div></div><div className="conversion-row"><span>Interview → Offer</span><strong className="mono">{interviews ? Math.round((offers / interviews) * 100) : 0}%</strong><div className="progress"><span style={{ width: `${interviews ? Math.round((offers / interviews) * 100) : 0}%` }} /></div></div></section> : <div className="empty-state"><span className="empty-icon"><ChartNoAxesColumnIncreasing /></span><h2>More activity is needed</h2><p>Roleway waits for at least three recorded applications before showing conversion rates. This avoids conclusions from a sample too small to trust.</p></div>}</div>;
}
