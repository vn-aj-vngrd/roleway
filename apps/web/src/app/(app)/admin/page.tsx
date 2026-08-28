import { Activity, Bot, BriefcaseBusiness, CalendarClock, Database, FileText, Search, ShieldCheck, Target, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/supabase/server";
import { setAdminRole } from "./actions";

type AdminView = "overview" | "users" | "system" | "audit";
type RecentUser = { id: string; email: string | null; name: string | null; createdAt: string; lastSignInAt: string | null; onboarded: boolean; projects: number; opportunities: number };
type AdminData = { users: number; active7d: number; registrations30d: number; onboarded: number; projects: number; jobs: number; opportunities: number; applications: number; interviews: number; documents: number; aiRuns30d: number; failedAiRuns30d: number; recentUsers: RecentUser[]; events7d: Record<string, number> };
type AdminUser = RecentUser & { jobs: number; applications: number; adminRole: string | null };
type SystemHealth = { checkedAt: string; database: string; applicationErrors24h: number; failedAiRuns24h: number; providerConnectionsInError: number; notifications24h: number; scheduledInterviews7d: number; adminActions30d: number; recentErrors: Array<{ category: string; code: string; createdAt: string }> };
type AuditLog = { id: string; actorEmail: string | null; action: string; targetEmail: string | null; metadata: Record<string, unknown>; createdAt: string };

export default async function AdminPage(
  props: { searchParams: Promise<{ view?: string; q?: string; error?: string; saved?: string }> }
) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) redirect("/login");
  const [{ data: allowed }, { data: owner }] = await Promise.all([auth.supabase.rpc("is_roleway_admin"), auth.supabase.rpc("is_roleway_owner")]);
  if (allowed !== true) redirect("/home");
  const view: AdminView = ["overview", "users", "system", "audit"].includes(query.view ?? "") ? query.view as AdminView : "overview";

  const dashboardPromise = view === "overview" ? auth.supabase.rpc("admin_dashboard") : Promise.resolve({ data: null, error: null });
  const usersPromise = view === "users" ? auth.supabase.rpc("admin_user_list", { input_query: query.q ?? "", input_limit: 100 }) : Promise.resolve({ data: null, error: null });
  const systemPromise = view === "system" ? auth.supabase.rpc("admin_system_health") : Promise.resolve({ data: null, error: null });
  const auditPromise = view === "audit" ? auth.supabase.rpc("admin_audit_log_list", { input_limit: 100 }) : Promise.resolve({ data: null, error: null });
  const [dashboardResult, usersResult, systemResult, auditResult] = await Promise.all([dashboardPromise, usersPromise, systemPromise, auditPromise]);
  const loadError = dashboardResult.error || usersResult.error || systemResult.error || auditResult.error;
  const dashboard = dashboardResult.data as AdminData | null;
  const users = (usersResult.data ?? []) as AdminUser[];
  const system = systemResult.data as SystemHealth | null;
  const audits = (auditResult.data ?? []) as AuditLog[];

  return <div className="page admin-page"><header className="page-header"><div className="page-header-copy"><h1>Admin console</h1><p className="page-subtitle">Account activity, product usage, administration, and system signals from Roleway’s database.</p></div><span className="tag"><ShieldCheck aria-hidden="true" />Protected</span></header><nav className="admin-nav" aria-label="Admin sections">{(["overview", "users", "system", "audit"] as const).map((item) => <Link className={view === item ? "active" : ""} href={`/admin?view=${item}`} key={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</Link>)}</nav>{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}{query.saved ? <div className="form-alert success" role="status">Admin role updated and recorded in the audit log.</div> : null}{loadError ? <div className="form-alert error" role="alert">Admin data could not be loaded.</div> : null}{view === "overview" && dashboard ? <AdminOverview data={dashboard} /> : null}{view === "users" ? <AdminUsers users={users} query={query.q ?? ""} canManageRoles={owner === true} /> : null}{view === "system" && system ? <AdminSystem data={system} /> : null}{view === "audit" ? <AdminAudit logs={audits} /> : null}</div>;
}

function AdminOverview({ data }: { data: AdminData }) {
  const events = Object.entries(data.events7d).sort((left, right) => right[1] - left[1]);
  return <><section className="admin-metrics" aria-label="Platform metrics"><Metric icon={Users} value={data.users} label="Total accounts" /><Metric icon={UserCheck} value={data.active7d} label="Active in 7 days" /><Metric icon={BriefcaseBusiness} value={data.projects} label="Active workspaces" /><Metric icon={Target} value={data.opportunities} label="Opportunities" /><Metric icon={FileText} value={data.applications} label="Applications" /><Metric icon={CalendarClock} value={data.interviews} label="Interviews" /></section><div className="admin-overview-grid"><section className="admin-section"><header><div><h2>Recent accounts</h2><p>{data.registrations30d} registrations in the last 30 days · {data.onboarded} onboarded total.</p></div><Link href="/admin?view=users">View users</Link></header><div className="admin-table" role="table" aria-label="Recent accounts"><div className="admin-table-row header" role="row"><span role="columnheader">Account</span><span role="columnheader">Workspaces</span><span role="columnheader">Joined</span></div>{data.recentUsers.map((user) => <div className="admin-table-row" role="row" key={user.id}><span role="cell"><strong>{user.name || "Unnamed account"}</strong><small>{user.email || "No email"}</small></span><span role="cell">{user.projects} · {user.opportunities} opp.</span><time role="cell" dateTime={user.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt))}</time></div>)}</div></section><section className="admin-section admin-activity-summary"><header><div><h2>Product activity</h2><p>Recorded event types in the last seven days.</p></div></header>{events.length ? <div>{events.map(([event, count]) => <p key={event}><span>{event.replaceAll("_", " ")}</span><strong>{count}</strong></p>)}</div> : <p className="empty-inline">No Opportunity events were recorded.</p>}<footer><span><Bot aria-hidden="true" />AI runs, 30 days</span><strong>{data.aiRuns30d}</strong><small>{data.failedAiRuns30d} failed</small></footer></section></div></>;
}

function AdminUsers({ users, query, canManageRoles }: { users: AdminUser[]; query: string; canManageRoles: boolean }) {
  return <section className="admin-section admin-users-section"><header><div><h2>Users</h2><p>Search accounts and review actual product activity. Only owners can grant administrative access.</p></div><form className="admin-user-search"><label className="sr-only" htmlFor="adminUserQuery">Search users</label><Search aria-hidden="true" /><input id="adminUserQuery" name="q" defaultValue={query} placeholder="Email or name" /><input type="hidden" name="view" value="users" /><Button className="button secondary" variant="outline">Search</Button></form></header><div className="admin-user-table" role="table" aria-label="Roleway accounts"><div className="admin-user-row header" role="row"><span role="columnheader">Account</span><span role="columnheader">Usage</span><span role="columnheader">Last sign in</span><span role="columnheader">Admin access</span></div>{users.map((user) => <div className="admin-user-row" role="row" key={user.id}><span role="cell"><strong>{user.name || "Unnamed account"}</strong><small>{user.email || "No email"} · joined {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt))}</small></span><span role="cell"><strong>{user.projects} searches</strong><small>{user.jobs} jobs · {user.opportunities} opportunities · {user.applications} applications</small></span><span role="cell">{user.lastSignInAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.lastSignInAt)) : "Never"}</span><span role="cell">{canManageRoles ? <form action={setAdminRole} className="admin-role-form"><input type="hidden" name="userId" value={user.id} /><SelectField id={`admin-role-${user.id}`} name="role" defaultValue={user.adminRole ?? "none"} ariaLabel={`Admin role for ${user.email ?? user.name ?? "user"}`} options={[{ value: "none", label: "No admin access" }, { value: "viewer", label: "Viewer" }, { value: "support", label: "Support" }, { value: "admin", label: "Admin" }, { value: "owner", label: "Owner" }]} /><SubmitButton className="button ghost" pendingLabel="Saving…">Save</SubmitButton></form> : <span className="status-label neutral"><i />{user.adminRole ?? "User"}</span>}</span></div>)}</div>{users.length === 0 ? <div className="empty-state"><h2>No matching accounts</h2><p>Try a different email address or name.</p></div> : null}</section>;
}

function AdminSystem({ data }: { data: SystemHealth }) {
  const signals = [
    ["Database", data.database, "The admin health query completed successfully."],
    ["Application errors · 24h", data.applicationErrors24h.toString(), "Redacted failures recorded by critical server workflows."],
    ["Failed AI runs · 24h", data.failedAiRuns24h.toString(), "Provider requests that Roleway recorded as failed."],
    ["Provider connections in error", data.providerConnectionsInError.toString(), "Saved user connections whose latest test failed."],
    ["Notifications · 24h", data.notifications24h.toString(), "Workspace notifications created from real events."],
    ["Scheduled interviews · 7d", data.scheduledInterviews7d.toString(), "Upcoming interview records across active accounts."],
    ["Admin actions · 30d", data.adminActions30d.toString(), "Role changes written to the admin audit log."],
  ];
  return <section className="admin-section admin-system"><header><div><h2>System health</h2><p>Checked {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.checkedAt))}. Values are database-backed; no synthetic uptime is shown.</p></div><Database aria-hidden="true" /></header><div>{signals.map(([label, value, description]) => <article key={label}><span><strong>{label}</strong><small>{description}</small></span><b className="mono">{value}</b></article>)}</div></section>;
}

function AdminAudit({ logs }: { logs: AuditLog[] }) {
  return <section className="admin-section"><header><div><h2>Audit log</h2><p>Consequential administrative actions, newest first.</p></div><Activity aria-hidden="true" /></header>{logs.length ? <div className="admin-audit-list">{logs.map((log) => <article key={log.id}><span className="status-dot" /><div><strong>{log.action.replaceAll("_", " ")}</strong><p>{log.actorEmail || "Unknown actor"}{log.targetEmail ? ` → ${log.targetEmail}` : ""}</p></div><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</time></article>)}</div> : <div className="empty-state"><h2>No admin actions recorded</h2><p>Role changes and future consequential admin operations will appear here.</p></div>}</section>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return <article className="admin-metric"><Icon aria-hidden="true" /><div><strong className="mono">{value.toLocaleString()}</strong><span>{label}</span></div></article>;
}
