import { Activity, BriefcaseBusiness, FileText, ShieldCheck, Target, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const ADMIN_EMAIL = "vanajvanguardia@gmail.com";
type AdminData = { users: number; onboarded: number; jobs: number; opportunities: number; documents: number; recentUsers: Array<{ id: string; email: string | null; name: string | null; createdAt: string; onboarded: boolean }> };

export default async function AdminPage() {
  const auth = await requireUser();
  if (!auth) return null;
  if (auth.user.email?.toLowerCase() !== ADMIN_EMAIL) redirect("/today");
  const { data, error } = await auth.supabase.rpc("admin_dashboard");
  const dashboard = data as AdminData | null;

  return <div className="page admin-page"><header className="page-header"><div className="page-header-copy"><div className="admin-title"><span className="admin-mark"><ShieldCheck aria-hidden="true" /></span><div><h1>Admin console</h1><p className="page-subtitle">Platform health and account activity.</p></div></div></div><span className="tag"><Activity aria-hidden="true" />Production</span></header>{error || !dashboard ? <div className="form-alert error" role="alert">Admin data could not be loaded.</div> : <><section className="admin-metrics" aria-label="Platform metrics"><Metric icon={Users} value={dashboard.users} label="Total accounts" /><Metric icon={ShieldCheck} value={dashboard.onboarded} label="Onboarded" /><Metric icon={BriefcaseBusiness} value={dashboard.jobs} label="Jobs captured" /><Metric icon={Target} value={dashboard.opportunities} label="Opportunities" /><Metric icon={FileText} value={dashboard.documents} label="Documents" /></section><section className="admin-section"><header><div><h2>Recent accounts</h2><p>Newest accounts across the platform.</p></div><span className="mono small">{dashboard.recentUsers.length} shown</span></header><div className="admin-table" role="table" aria-label="Recent accounts"><div className="admin-table-row header" role="row"><span role="columnheader">Account</span><span role="columnheader">Status</span><span role="columnheader">Joined</span></div>{dashboard.recentUsers.map((user) => <div className="admin-table-row" role="row" key={user.id}><span role="cell"><strong>{user.name || "Unnamed account"}</strong><small>{user.email || "No email"}</small></span><span role="cell"><span className={`status-label ${user.onboarded ? "success" : "neutral"}`}><i />{user.onboarded ? "Onboarded" : "Pending"}</span></span><time role="cell" dateTime={user.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt))}</time></div>)}</div></section></>}</div>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return <article className="admin-metric"><Icon aria-hidden="true" /><div><strong className="mono">{value.toLocaleString()}</strong><span>{label}</span></div></article>;
}
