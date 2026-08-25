import { CalendarClock, Plus } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

type OpportunityOption = { id: string; reference_number: number; jobs: { company: string; title: string } | null };

export default async function PreparationPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const [interviewsResult, opportunitiesResult] = await Promise.all([
    auth.supabase.from("interviews").select("id, interview_type, starts_at, duration_minutes, opportunity_id, opportunities(reference_number, jobs(company, title))").order("starts_at"),
    auth.supabase.from("opportunities").select("id, reference_number, jobs(company, title)").neq("stage", "closed").order("updated_at", { ascending: false }),
  ]);
  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityOption[];
  const interviews = interviewsResult.data ?? [];
  return <div className="page narrow"><header className="page-header"><div className="page-header-copy"><h1>Interviews</h1><p className="page-subtitle">Keep every scheduled conversation and its preparation attached to the right Opportunity.</p></div>{opportunities.length ? <Link className="button primary" href="/preparation/new"><Plus />Add interview</Link> : null}</header>{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}{query.created ? <div className="form-alert success" role="status">Interview scheduled.</div> : null}{interviewsResult.error ? <div className="form-alert error">Interviews could not be loaded.</div> : null}{!interviewsResult.error && interviews.length === 0 ? <div className="empty-state"><span className="empty-icon"><CalendarClock /></span><h2>No interviews scheduled</h2><p>When a conversation is booked, add it here. It will appear on Today and stay attached to the Opportunity.</p>{opportunities.length === 0 ? <Link className="button primary" href="/jobs/new">Add a job first</Link> : null}</div> : <section className="document-list">{interviews.map((interview) => { const opportunity = interview.opportunities as unknown as { reference_number: number; jobs: { company: string; title: string } | null } | null; return <article className="list-row" key={interview.id}><span className="list-icon"><CalendarClock /></span><div><div className="list-title">{interview.interview_type}</div><div className="list-subtitle">{opportunity?.jobs?.company} · {opportunity?.jobs?.title}</div></div><time className="small">{new Date(interview.starts_at).toLocaleString()}</time><span className="muted small">{interview.duration_minutes ?? 60} min</span><Link className="icon-button" data-tooltip="Open opportunity" href={`/opportunities/${interview.opportunity_id}`} aria-label="Open opportunity">→</Link></article>; })}</section>}</div>;
}
