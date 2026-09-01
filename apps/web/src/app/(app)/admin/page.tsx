import { Activity, Bot, BriefcaseBusiness, CalendarClock, Database, FileText, HardDrive, Search, Settings2, ShieldCheck, Target, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/supabase/server";
import { setAdminRole, setRegistrationPolicy, setUserSuspension } from "./actions";

type AdminView = "overview" | "users" | "data" | "system" | "audit" | "settings";
type RecentUser = { id: string; email: string | null; name: string | null; createdAt: string; lastSignInAt: string | null; onboarded: boolean; projects: number; opportunities: number };
type AdminData = { users: number; active7d: number; registrations30d: number; onboarded: number; projects: number; jobs: number; opportunities: number; applications: number; interviews: number; documents: number; aiRuns30d: number; failedAiRuns30d: number; recentUsers: RecentUser[]; events7d: Record<string, number> };
type AdminUser = RecentUser & { jobs: number; applications: number; adminRole: string | null; suspended: boolean };
type SystemHealth = { checkedAt: string; database: string; applicationErrors24h: number; failedAiRuns24h: number; providerConnectionsInError: number; notifications24h: number; scheduledInterviews7d: number; adminActions30d: number; recentErrors: Array<{ category: string; code: string; createdAt: string }> };
type AuditLog = { id: string; actorEmail: string | null; action: string; targetEmail: string | null; metadata: Record<string, unknown>; createdAt: string };
type Admission = { registrationEnabled: boolean; signupLimit: number; accountCount: number; remaining: number; acceptingSignups: boolean };
type DataOverview = { records: Record<string, number>; quality: Record<string, number>; generatedAt: string };

const adminViews: Array<{ id: AdminView; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "users", label: "Users" }, { id: "data", label: "Data" },
  { id: "system", label: "System" }, { id: "audit", label: "Audit" }, { id: "settings", label: "Settings" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; error?: string; saved?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) redirect("/login");
  const [{ data: allowed }, { data: owner }, { data: canManage }] = await Promise.all([
    auth.supabase.rpc("is_roleway_admin"), auth.supabase.rpc("is_roleway_owner"), auth.supabase.rpc("can_manage_roleway_users"),
  ]);
  if (allowed !== true) redirect("/home");
  const view = adminViews.some((item) => item.id === query.view) ? query.view as AdminView : "overview";
  const userQuery = (query.q ?? "").slice(0, 320);

  const [dashboardResult, usersResult, systemResult, auditResult, dataResult, admissionResult] = await Promise.all([
    view === "overview" ? auth.supabase.rpc("admin_dashboard") : Promise.resolve({ data: null, error: null }),
    view === "users" ? auth.supabase.rpc("admin_user_list", { input_query: userQuery, input_limit: 200 }) : Promise.resolve({ data: null, error: null }),
    view === "system" ? auth.supabase.rpc("admin_system_health") : Promise.resolve({ data: null, error: null }),
    view === "audit" ? auth.supabase.rpc("admin_audit_log_list", { input_limit: 100 }) : Promise.resolve({ data: null, error: null }),
    view === "data" ? auth.supabase.rpc("admin_data_overview") : Promise.resolve({ data: null, error: null }),
    view === "overview" || view === "settings" ? auth.supabase.rpc("signup_admission_status") : Promise.resolve({ data: null, error: null }),
  ]);
  const loadError = [dashboardResult, usersResult, systemResult, auditResult, dataResult, admissionResult].find((result) => result.error)?.error;

  return (
    <div className="page admin-page">
      <header className="page-header"><div className="page-header-copy"><h1>Admin console</h1><p className="page-subtitle">Operate access, registrations, product data, and system health from verified Roleway records.</p></div><span className="tag"><ShieldCheck aria-hidden="true" />Protected</span></header>
      <nav className="admin-nav" aria-label="Admin sections">{adminViews.map((item) => <Link className={view === item.id ? "active" : ""} href={`/admin?view=${item.id}`} key={item.id}>{item.label}</Link>)}</nav>
      {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
      {query.saved ? <div className="form-alert success" role="status">{query.saved}</div> : null}
      {loadError ? <div className="form-alert error" role="alert">Admin data could not be loaded. No operation was performed.</div> : null}
      {view === "overview" && dashboardResult.data ? <AdminOverview data={dashboardResult.data as AdminData} admission={admissionResult.data as Admission | null} /> : null}
      {view === "users" ? <AdminUsers users={(usersResult.data ?? []) as AdminUser[]} query={userQuery} canManageRoles={owner === true} canManageUsers={canManage === true} currentUserId={auth.user.id} /> : null}
      {view === "data" && dataResult.data ? <AdminDataView data={dataResult.data as DataOverview} /> : null}
      {view === "system" && systemResult.data ? <AdminSystem data={systemResult.data as SystemHealth} /> : null}
      {view === "audit" ? <AdminAudit logs={(auditResult.data ?? []) as AuditLog[]} /> : null}
      {view === "settings" && admissionResult.data ? <AdminSettings admission={admissionResult.data as Admission} canManage={canManage === true} /> : null}
    </div>
  );
}

function AdminOverview({ data, admission }: { data: AdminData; admission: Admission | null }) {
  const events = Object.entries(data.events7d).sort((left, right) => right[1] - left[1]);
  const activationRate = data.users ? Math.round((data.onboarded / data.users) * 100) : 0;
  return <>
    <section className="admin-metrics" aria-label="Platform metrics"><Metric icon={Users} value={data.users} label="Total accounts" /><Metric icon={UserCheck} value={data.active7d} label="Active in 7 days" /><Metric icon={BriefcaseBusiness} value={data.projects} label="Active workspaces" /><Metric icon={Target} value={data.opportunities} label="Opportunities" /><Metric icon={FileText} value={data.applications} label="Applications" /><Metric icon={CalendarClock} value={data.interviews} label="Interviews" /></section>
    {admission ? <section className="admin-admission-strip" aria-label="Registration capacity"><div><strong>{admission.accountCount.toLocaleString()} / {admission.signupLimit.toLocaleString()}</strong><span>account capacity</span></div><div><strong>{admission.remaining.toLocaleString()}</strong><span>places remaining</span></div><div><strong>{activationRate}%</strong><span>onboarding completion</span></div><span className={`status-label ${admission.acceptingSignups ? "positive" : "neutral"}`}><i />{admission.acceptingSignups ? "Signups open" : "Signups closed"}</span></section> : null}
    <div className="admin-overview-grid"><section className="admin-section"><header><div><h2>Recent accounts</h2><p>{data.registrations30d} registrations in 30 days · {data.onboarded} onboarded total.</p></div><Link href="/admin?view=users">View users</Link></header><div className="admin-table" role="table" aria-label="Recent accounts"><div className="admin-table-row header" role="row"><span role="columnheader">Account</span><span role="columnheader">Workspaces</span><span role="columnheader">Joined</span></div>{data.recentUsers.map((user) => <div className="admin-table-row" role="row" key={user.id}><span role="cell"><strong>{user.name || "Unnamed account"}</strong><small>{user.email || "No email"}</small></span><span role="cell">{user.projects} · {user.opportunities} opp.</span><time role="cell" dateTime={user.createdAt}>{formatDate(user.createdAt)}</time></div>)}</div></section><section className="admin-section admin-activity-summary"><header><div><h2>Product activity</h2><p>Opportunity events in the last seven days.</p></div></header>{events.length ? <div>{events.map(([event, count]) => <p key={event}><span>{event.replaceAll("_", " ")}</span><strong>{count}</strong></p>)}</div> : <p className="empty-inline">No Opportunity events were recorded.</p>}<footer><span><Bot aria-hidden="true" />AI runs, 30 days</span><strong>{data.aiRuns30d}</strong><small>{data.failedAiRuns30d} failed</small></footer></section></div>
  </>;
}

function AdminUsers({ users, query, canManageRoles, canManageUsers, currentUserId }: { users: AdminUser[]; query: string; canManageRoles: boolean; canManageUsers: boolean; currentUserId: string }) {
  return <section className="admin-section admin-users-section"><header><div><h2>Users</h2><p>Search up to 200 accounts, review usage, suspend access, and assign protected roles.</p></div><form className="admin-user-search"><label className="sr-only" htmlFor="adminUserQuery">Search users</label><Search aria-hidden="true" /><input id="adminUserQuery" name="q" defaultValue={query} maxLength={320} placeholder="Email or name" /><input type="hidden" name="view" value="users" /><Button variant="outline">Search</Button></form></header><div className="admin-user-table" role="table" aria-label="Roleway accounts"><div className="admin-user-row header" role="row"><span role="columnheader">Account</span><span role="columnheader">Usage</span><span role="columnheader">Status</span><span role="columnheader">Administration</span></div>{users.map((user) => {
    const manageable = canManageUsers && user.adminRole !== "owner" && user.id !== currentUserId;
    return <div className="admin-user-row" role="row" key={user.id}><span role="cell"><strong>{user.name || "Unnamed account"}</strong><small>{user.email || "No email"} · joined {formatDate(user.createdAt)}</small></span><span role="cell"><strong>{user.projects} workspaces</strong><small>{user.jobs} jobs · {user.opportunities} opportunities · {user.applications} applications</small></span><span role="cell"><span className={`status-label ${user.suspended ? "danger" : "positive"}`}><i />{user.suspended ? "Suspended" : "Active"}</span><small>{user.lastSignInAt ? `Last sign in ${formatDate(user.lastSignInAt)}` : "Never signed in"}</small></span><span role="cell" className="admin-user-actions">{canManageRoles ? <form action={setAdminRole} className="admin-role-form"><input type="hidden" name="userId" value={user.id} /><SelectField id={`admin-role-${user.id}`} name="role" defaultValue={user.adminRole ?? "none"} ariaLabel={`Admin role for ${user.email ?? user.name ?? "user"}`} options={[{ value: "none", label: "No admin access" }, { value: "viewer", label: "Viewer" }, { value: "support", label: "Support" }, { value: "admin", label: "Admin" }, { value: "owner", label: "Owner" }]} /><SubmitButton variant="ghost" pendingLabel="Saving…">Save role</SubmitButton></form> : <small>{user.adminRole ?? "No admin access"}</small>}{manageable ? <form action={setUserSuspension}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="operation" value={user.suspended ? "reactivate" : "suspend"} /><SubmitButton variant={user.suspended ? "outline" : "destructive"} pendingLabel="Updating…">{user.suspended ? "Reactivate" : "Suspend"}</SubmitButton></form> : null}</span></div>;
  })}</div>{users.length === 0 ? <div className="empty-state"><h2>No matching accounts</h2><p>Try a different email address or name.</p></div> : null}</section>;
}

function AdminDataView({ data }: { data: DataOverview }) {
  return <div className="admin-data-grid"><section className="admin-section"><header><div><h2>Stored records</h2><p>Live row counts across core product relations.</p></div><HardDrive aria-hidden="true" /></header><div className="admin-data-list">{Object.entries(data.records).map(([label, count]) => <p key={label}><span>{humanize(label)}</span><strong className="mono">{count.toLocaleString()}</strong></p>)}</div></section><section className="admin-section"><header><div><h2>Data quality</h2><p>Operational records that may need product or support attention.</p></div><Target aria-hidden="true" /></header><div className="admin-data-list">{Object.entries(data.quality).map(([label, count]) => <p key={label}><span>{humanize(label)}</span><strong className="mono">{count.toLocaleString()}</strong></p>)}</div><p className="admin-generated">Generated {formatDateTime(data.generatedAt)}</p></section></div>;
}

function AdminSettings({ admission, canManage }: { admission: Admission; canManage: boolean }) {
  return <section className="admin-section admin-settings"><header><div><h2>Registration controls</h2><p>The database enforces this cap transactionally, including concurrent signups.</p></div><Settings2 aria-hidden="true" /></header><div className="admin-capacity"><span><strong>{admission.accountCount.toLocaleString()}</strong> current accounts</span><span><strong>{admission.remaining.toLocaleString()}</strong> places remaining</span></div>{canManage ? <form action={setRegistrationPolicy} className="admin-settings-form"><label htmlFor="registrationEnabled">Registration status</label><SelectField id="registrationEnabled" name="registrationEnabled" defaultValue={String(admission.registrationEnabled)} ariaLabel="Registration status" options={[{ value: "true", label: "Open" }, { value: "false", label: "Paused" }]} /><label htmlFor="signupLimit">Maximum accounts</label><Input id="signupLimit" name="signupLimit" type="number" min={1} max={1_000_000} defaultValue={admission.signupLimit} required /><SubmitButton pendingLabel="Saving controls…">Save controls</SubmitButton></form> : <p className="empty-inline">Owner or admin access is required to change registration controls.</p>}<aside className="admin-security-note"><ShieldCheck aria-hidden="true" /><div><strong>Cloudflare Turnstile is enforced separately.</strong><p>Keep Turnstile enabled in Supabase Auth so direct API signups cannot bypass the application form.</p></div></aside></section>;
}

function AdminSystem({ data }: { data: SystemHealth }) {
  const signals = [["Database", data.database, "The protected health query completed."], ["Application errors · 24h", String(data.applicationErrors24h), "Redacted critical workflow failures."], ["Failed AI runs · 24h", String(data.failedAiRuns24h), "Provider requests recorded as failed."], ["Provider connections in error", String(data.providerConnectionsInError), "Connections whose latest test failed."], ["Notifications · 24h", String(data.notifications24h), "Notifications created from real events."], ["Scheduled interviews · 7d", String(data.scheduledInterviews7d), "Upcoming scheduled interviews."], ["Admin actions · 30d", String(data.adminActions30d), "Consequential operations in the audit log."]];
  return <section className="admin-section admin-system"><header><div><h2>System health</h2><p>Checked {formatDateTime(data.checkedAt)}. These are database signals, not synthetic uptime.</p></div><Database aria-hidden="true" /></header><div>{signals.map(([label, value, description]) => <article key={label}><span><strong>{label}</strong><small>{description}</small></span><b className="mono">{value}</b></article>)}</div>{data.recentErrors.length ? <div className="admin-error-list"><h3>Recent redacted errors</h3>{data.recentErrors.map((event) => <p key={`${event.code}-${event.createdAt}`}><span>{event.category} · {event.code}</span><time>{formatDateTime(event.createdAt)}</time></p>)}</div> : null}</section>;
}

function AdminAudit({ logs }: { logs: AuditLog[] }) {
  return <section className="admin-section"><header><div><h2>Audit log</h2><p>Consequential administrative actions, newest first.</p></div><Activity aria-hidden="true" /></header>{logs.length ? <div className="admin-audit-list">{logs.map((log) => <article key={log.id}><span className="status-dot" /><div><strong>{log.action.replaceAll("_", " ")}</strong><p>{log.actorEmail || "Unknown actor"}{log.targetEmail ? ` → ${log.targetEmail}` : ""}</p></div><time dateTime={log.createdAt}>{formatDateTime(log.createdAt)}</time></article>)}</div> : <div className="empty-state"><h2>No admin actions recorded</h2><p>Role, registration, and account status changes will appear here.</p></div>}</section>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) { return <article className="admin-metric"><Icon aria-hidden="true" /><div><strong className="mono">{value.toLocaleString()}</strong><span>{label}</span></div></article>; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
