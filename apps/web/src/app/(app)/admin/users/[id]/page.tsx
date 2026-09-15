import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { getPlans } from "@/features/billing/queries";
import { formatBytes, type Plan, type Usage } from "@/features/billing/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { SelectField } from "@/components/form-controls";
import { assignPlan } from "../../billing-actions";
import { setAdminRole, setUserSuspension } from "../../actions";
type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  };
  plan: Plan;
  usage: Usage;
  assignment: { plan_slug: string; expires_at: string | null } | null;
  records: Array<{ id: string; label: string }>;
  record: Record<string, unknown> | null;
};
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; record?: string }>;
}) {
  const [auth, { id }, q] = await Promise.all([
    requireUser(),
    params,
    searchParams,
  ]);
  if (!auth) redirect("/login");
  if (!z.string().uuid().safeParse(id).success) redirect("/admin?view=users");
  const { data: allowed } = await auth.supabase.rpc("can_manage_roleway_users");
  if (allowed !== true) redirect("/home");
  const kinds = [
    "workspaces",
    "jobs",
    "opportunities",
    "documents",
    "contacts",
    "interviews",
  ];
  const kind = kinds.includes(q.kind || "") ? q.kind! : "workspaces";
  const record = z.string().uuid().safeParse(q.record);
  const [detail, owner, manageable, plans] = await Promise.all([
    auth.supabase.rpc("admin_user_detail", {
      input_user_id: id,
      input_kind: kind,
      input_record_id: record.success ? record.data : null,
    }),
    auth.supabase.rpc("is_roleway_owner"),
    auth.supabase.rpc("admin_target_is_manageable", { input_user_id: id }),
    getPlans(true),
  ]);
  const d = detail.data as UserDetail | null;
  return (
    <div className="page admin-page">
      <Button variant="outline" render={<Link href="/admin?view=users" />}>
        Back to users
      </Button>
      {detail.error || !d ? (
        <p role="alert">
          This account could not be loaded. Refresh the list and try again.
        </p>
      ) : (
        <>
          <header className="page-header">
            <div>
              <h1>{d.user.name || "Unnamed account"}</h1>
              <p>{d.user.email}</p>
            </div>
          </header>
          <section className="management-section">
            <h2>Account & usage</h2>
            <dl className="account-detail-grid">
              <dt>Account ID</dt>
              <dd>{id}</dd>
              <dt>Joined</dt>
              <dd>{new Date(d.user.created_at).toLocaleString()}</dd>
              <dt>Last sign-in</dt>
              <dd>
                {d.user.last_sign_in_at
                  ? new Date(d.user.last_sign_in_at).toLocaleString()
                  : "Never"}
              </dd>
              <dt>Effective plan</dt>
              <dd>{d.plan.name}</dd>
              <dt>Active Workspaces</dt>
              <dd>
                {d.usage?.active_workspaces ?? 0} /{" "}
                {d.plan.slug === "unlimited"
                  ? "Unlimited"
                  : d.plan.workspace_limit}
              </dd>
              <dt>Saved content</dt>
              <dd>
                {formatBytes(d.usage?.content_bytes ?? 0)} /{" "}
                {d.plan.slug === "unlimited"
                  ? "Unlimited"
                  : formatBytes(d.plan.storage_limit_bytes)}
              </dd>
              <dt>Paid term ends</dt>
              <dd>
                {d.assignment?.expires_at
                  ? new Date(d.assignment.expires_at).toLocaleString()
                  : "No paid term"}
              </dd>
            </dl>
          </section>
          <section className="management-section" id="plan">
            <h2>Plan assignment</h2>
            <p>
              Use for a verified manual arrangement or support correction.
              Existing data remains intact. Plus and Pro default to one calendar
              month. Free and Unlimited do not expire; a plan assignment never
              grants admin permissions.
            </p>
            <p id="plan-expiry-help">
              Leave expiry blank for a one-month paid term. Ignored for Free and
              Unlimited.
            </p>
            <form action={assignPlan} className="management-form">
              <input type="hidden" name="userId" value={id} />
              <div className="form-grid">
                <div className="labeled-select">
                  <span>Plan</span>
                  <SelectField
                    name="plan"
                    id="assigned-plan"
                    ariaLabel="Plan"
                    defaultValue={d.plan.slug}
                    options={plans.map((plan) => ({
                      value: plan.slug,
                      label: `${plan.name}${plan.slug === "unlimited" ? " (private)" : ""}`,
                    }))}
                  />
                </div>
                <label>
                  Paid expiry override (UTC, optional)
                  <Input
                    name="expires"
                    type="date"
                    aria-describedby="plan-expiry-help"
                  />
                </label>
              </div>
              <label>
                Reason
                <Input name="reason" minLength={3} maxLength={1000} required />
              </label>
              <SubmitButton pendingLabel="Assigning…">Assign plan</SubmitButton>
            </form>
          </section>
          <section className="management-section">
            <h2>Access controls</h2>
            <div className="action-row">
              {owner.data === true ? (
                <form action={setAdminRole} className="management-form">
                  <input type="hidden" name="userId" value={id} />
                  <div className="labeled-select">
                    <span>New admin role</span>
                    <SelectField
                      name="role"
                      id="user-role"
                      ariaLabel="New admin role"
                      defaultValue=""
                      required
                      options={[
                        { value: "none", label: "No admin access" },
                        { value: "viewer", label: "Viewer" },
                        { value: "support", label: "Support" },
                        { value: "admin", label: "Admin" },
                        { value: "owner", label: "Owner" },
                      ]}
                    />
                  </div>
                  <SubmitButton variant="outline" pendingLabel="Saving…">
                    Set admin role
                  </SubmitButton>
                </form>
              ) : null}
              {manageable.data === true ? (
                <form action={setUserSuspension} className="management-form">
                  <input type="hidden" name="userId" value={id} />
                  <div className="labeled-select">
                    <span>Account access</span>
                    <SelectField
                      name="operation"
                      id="user-access"
                      ariaLabel="Account access"
                      defaultValue=""
                      required
                      options={[
                        { value: "reactivate", label: "Reactivate" },
                        { value: "suspend", label: "Suspend" },
                      ]}
                    />
                  </div>
                  <SubmitButton variant="outline" pendingLabel="Updating…">
                    Update access
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          </section>
          <section className="management-section" id="content">
            <h2>Account content</h2>
            <p>
              Read-only inspection for support. Every view is recorded in the
              admin audit log. Showing the latest 100 records per type.
            </p>
            <nav className="content-tabs" aria-label="Content type">
              {kinds.map((k) => (
                <Button
                  key={k}
                  variant={k === kind ? "secondary" : "outline"}
                  size="sm"
                  render={
                    <Link
                      href={`/admin/users/${id}?kind=${k}`}
                      aria-current={k === kind ? "page" : undefined}
                    />
                  }
                >
                  {k}
                </Button>
              ))}
            </nav>
            <div className="content-inspector">
              <div>
                {d.records.length ? (
                  d.records.map((r) => (
                    <Button
                      key={r.id}
                      className="record-choice"
                      variant={r.id === q.record ? "secondary" : "ghost"}
                      render={
                        <Link
                          href={`/admin/users/${id}?kind=${kind}&record=${r.id}`}
                        />
                      }
                    >
                      {r.label || "Untitled record"}
                    </Button>
                  ))
                ) : (
                  <p>No records of this type.</p>
                )}
              </div>
              <div>
                {d.record ? (
                  <dl className="record-fields">
                    {Object.entries(d.record).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replaceAll("_", " ")}</dt>
                        <dd>
                          {value === null ? (
                            "—"
                          ) : typeof value === "object" ? (
                            <pre>{JSON.stringify(value, null, 2)}</pre>
                          ) : (
                            String(value)
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>Select a record to view its exact stored content.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
