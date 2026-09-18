import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getPlans } from "@/features/billing/queries";
import {
  formatBytes,
  formatPrice,
  type PlanSummary,
  type PaymentRequest,
  type BillingSettings,
} from "@/features/billing/types";
import { cancelPayment, submitPayment } from "@/features/billing/actions";
import { PlanComparison } from "@/components/plan-comparison";
import { SettingsNav } from "@/components/settings-nav";
import { PageHeader } from "@/components/ui-primitives";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const [query, plans, summary, settings, payments] = await Promise.all([
    searchParams,
    getPlans(),
    auth.supabase.rpc("account_plan_summary"),
    auth.supabase.from("billing_settings").select("*").single(),
    auth.supabase
      .from("payment_request_summaries")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const state = summary.data as PlanSummary | null;
  const requests = (payments.data ?? []) as PaymentRequest[];
  const openSummary = requests.find(
    (r) => r.status === "awaiting_payment" || r.status === "pending",
  );
  const openResult = openSummary
    ? await auth.supabase
        .from("payment_requests")
        .select("*")
        .eq("id", openSummary.id)
        .eq("user_id", auth.user.id)
        .single()
    : null;
  const open = openResult?.data as PaymentRequest | null;
  return (
    <div className="page settings-page">
      <PageHeader
        title="Plan & billing"
        description="Your capacity, payment instructions, and plan history."
      />
      <div className="settings-layout">
        <SettingsNav active="Plan & billing" />
        <div className="settings-content billing-content">
          {query.error || query.saved ? (
            <Alert variant={query.error ? "danger" : "success"}>
              {query.error ? <CircleAlert /> : <CircleCheck />}
              <AlertDescription>{query.error || query.saved}</AlertDescription>
            </Alert>
          ) : null}
          {summary.error ||
          payments.error ||
          settings.error ||
          openResult?.error ? (
            <Alert variant="warning">
              <AlertDescription>
                Billing could not be loaded. Please refresh before making a
                payment.
              </AlertDescription>
            </Alert>
          ) : null}
          {state ? (
            <section className="billing-section">
              <h2>{state.plan.name} plan</h2>
              <p>
                {state.plan.slug === "unlimited"
                  ? "Assigned by an administrator. No expiry or Workspace/storage cap."
                  : state.plan.slug === "free"
                    ? "No payment required."
                    : `Access until ${new Date(state.expires_at!).toLocaleDateString()}. No automatic renewal or debit.`}
              </p>
              <div className="usage-grid">
                <Usage
                  label="Active Workspaces"
                  used={state.usage.active_workspaces}
                  limit={state.plan.workspace_limit}
                  unlimited={state.plan.slug === "unlimited"}
                />
                <Usage
                  label="Saved content"
                  used={state.usage.content_bytes}
                  limit={state.plan.storage_limit_bytes}
                  unlimited={state.plan.slug === "unlimited"}
                  bytes
                />
              </div>
              <p className="muted">
                Includes document versions and archived content.
                {state.plan.slug !== "unlimited"
                  ? " Existing data is preserved if you exceed a limit. Archive a Workspace to free an active slot; delete unused content to free storage."
                  : null}
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/settings/workspaces" />}
              >
                Manage Workspaces
              </Button>
            </section>
          ) : null}
          {open ? (
            <section className="billing-section">
              <h2>
                {open.status === "pending"
                  ? "Payment under review"
                  : "Complete your payment"}
              </h2>
              <p>
                <strong>{formatPrice(open.amount_minor, open.currency)}</strong>{" "}
                · {open.plan_slug} · one month
              </p>
              <p className="payment-reference">
                Request ID: <code>{open.id}</code>
              </p>
              {open.status === "pending" ? (
                <p>
                  We’ll activate your plan after verifying receipt. Transfer
                  reference: <strong>{open.transfer_reference}</strong>. Check
                  this page for updates.
                </p>
              ) : (
                <>
                  <PaymentInstructions settings={open.instructions_snapshot} />
                  <form action={submitPayment} className="billing-form">
                    <input type="hidden" name="id" value={open.id} />
                    <label htmlFor="reference">
                      Bank or wallet transfer reference
                    </label>
                    <Input
                      id="reference"
                      name="reference"
                      minLength={3}
                      maxLength={160}
                      required
                      placeholder="Enter the reference after paying"
                    />
                    <p className="muted">
                      Pay the exact amount above and include your request ID.
                      Only submit after the transfer succeeds.
                    </p>
                    <SubmitButton pendingLabel="Submitting…">
                      I’ve paid — submit for review
                    </SubmitButton>
                  </form>
                  <form action={cancelPayment}>
                    <input type="hidden" name="id" value={open.id} />
                    <SubmitButton variant="outline" pendingLabel="Cancelling…">
                      Cancel unpaid request
                    </SubmitButton>
                  </form>
                </>
              )}
            </section>
          ) : null}
          <section className="billing-section">
            <h2>Choose your capacity</h2>
            <p>
              Every plan includes core tracking. Paid plans use manual payment
              and admin verification.
            </p>
            <PlanComparison
              plans={plans}
              billing
              enabled={
                !!(settings.data as BillingSettings | null)?.enabled &&
                !summary.error &&
                !payments.error
              }
              hasOpenRequest={!!openSummary}
            />
          </section>
          <section className="billing-section">
            <h2>Payment history</h2>
            {requests.length ? (
              <div className="table-scroll">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Requested</th>
                      <th>Plan / amount</th>
                      <th>Status</th>
                      <th>Review note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {new Date(r.created_at).toLocaleDateString()}
                          <small>{r.id}</small>
                        </td>
                        <td>
                          {r.plan_slug}
                          <small>
                            {formatPrice(r.amount_minor, r.currency)}
                          </small>
                        </td>
                        <td>{r.status.replaceAll("_", " ")}</td>
                        <td>{r.review_note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No payments yet. Your Free plan does not require a payment.</p>
            )}
          </section>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/help/manual-payments" />}
          >
            Payment help
          </Button>
        </div>
      </div>
    </div>
  );
}
function Usage({
  label,
  used,
  limit,
  bytes = false,
  unlimited = false,
}: {
  label: string;
  used: number;
  limit: number;
  bytes?: boolean;
  unlimited?: boolean;
}) {
  return (
    <div className="usage-item">
      <div>
        <strong>{label}</strong>
        <span>
          {bytes ? formatBytes(used) : used} /{" "}
          {unlimited ? "Unlimited" : bytes ? formatBytes(limit) : limit}
        </span>
      </div>
      {!unlimited ? (
        <progress
          aria-label={label}
          value={Math.min(used, limit)}
          max={limit}
        />
      ) : null}
      {!unlimited && used >= limit ? (
        <p role="status">
          Limit reached. Free capacity or choose another plan to add more.
        </p>
      ) : null}
    </div>
  );
}
function PaymentInstructions({ settings }: { settings: BillingSettings }) {
  return (
    <div className="payment-instructions">
      <ol>
        <li>
          Transfer the exact amount to the account below, or scan its payment
          QR.
        </li>
        <li>Include the request ID as the payment message where supported.</li>
        <li>
          Return here and submit your transfer reference for verification.
        </li>
      </ol>
      <dl>
        <dt>Bank / wallet</dt>
        <dd>{settings.bank_name || "See QR instructions"}</dd>
        <dt>Account name</dt>
        <dd>{settings.account_name}</dd>
        <dt>Account number</dt>
        <dd>{settings.account_number || "Scan QR"}</dd>
      </dl>
      {settings.qr_image ? (
        <Image
          unoptimized
          className="payment-qr"
          src={settings.qr_image}
          alt="Payment QR code configured by Roleway administration"
          width={240}
          height={240}
        />
      ) : null}
      <p className="preserve-lines">{settings.instructions}</p>
      {settings.support_email ? (
        <a href={`mailto:${settings.support_email}`}>Contact payment support</a>
      ) : null}
    </div>
  );
}
