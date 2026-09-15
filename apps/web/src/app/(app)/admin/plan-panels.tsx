import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getPlans } from "@/features/billing/queries";
import {
  formatPrice,
  type BillingSettings,
  type PaymentRequest,
  type HelpArticle,
} from "@/features/billing/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { SelectField } from "@/components/form-controls";
import {
  savePlan,
  saveBilling,
  reviewPayment,
  saveArticle,
} from "./billing-actions";
export async function AdminPlans({ canManage }: { canManage: boolean }) {
  const plans = await getPlans(true);
  return (
    <section className="management-section">
      <h2>Capacity and availability</h2>
      <p>
        Changes apply to all accounts on the plan. Lower limits preserve
        existing records and block additional growth. Paid plans require a price
        before becoming available.
      </p>
      {!plans.length ? (
        <p role="alert">Plans could not be loaded.</p>
      ) : (
        plans.map((p) => (
          <form
            action={savePlan}
            className="management-form plan-editor"
            key={p.slug}
          >
            <fieldset disabled={!canManage}>
              <legend>
                {p.name}
                {p.slug === "unlimited" ? " · Private" : ""}
              </legend>
              {p.slug === "unlimited" ? (
                <p>
                  No Workspace or saved-content cap. Hidden from public pricing;
                  assign it from a user’s detail page. It does not grant admin
                  permissions.
                </p>
              ) : null}
              <input type="hidden" name="slug" value={p.slug} />
              <div className="form-grid">
                <label>
                  Display name
                  <Input
                    name="name"
                    defaultValue={p.name}
                    required
                    maxLength={40}
                  />
                </label>
                <label>
                  Description
                  <Input
                    name="description"
                    defaultValue={p.description}
                    maxLength={500}
                  />
                </label>
                <label>
                  {p.slug === "unlimited"
                    ? "Workspaces: Unlimited"
                    : "Active Workspaces"}
                  <Input
                    type={p.slug === "unlimited" ? "hidden" : "number"}
                    name="workspaces"
                    min={1}
                    max={1000}
                    required
                    defaultValue={p.workspace_limit}
                    readOnly={p.slug === "unlimited"}
                  />
                </label>
                <label>
                  {p.slug === "unlimited"
                    ? "Saved content: Unlimited"
                    : "Saved content (MiB)"}
                  <Input
                    type={p.slug === "unlimited" ? "hidden" : "number"}
                    name="storage"
                    min={1}
                    max={102400}
                    required
                    defaultValue={p.storage_limit_bytes / 1048576}
                    readOnly={p.slug === "unlimited"}
                  />
                </label>
                <label>
                  {p.slug === "unlimited"
                    ? "No payment required"
                    : "Monthly price"}
                  <Input
                    name="price"
                    type={p.slug === "unlimited" ? "hidden" : "number"}
                    min={0}
                    max={1000000}
                    step="0.01"
                    defaultValue={
                      p.price_minor === null ? "" : p.price_minor / 100
                    }
                    readOnly={p.slug === "free" || p.slug === "unlimited"}
                  />
                </label>
                <div className="labeled-select">
                  <span>Currency</span>
                  <SelectField
                    id={`currency-${p.slug}`}
                    name="currency"
                    ariaLabel="Currency"
                    defaultValue={p.currency}
                    disabled={p.slug === "unlimited"}
                    options={[
                      { value: "PHP", label: "PHP" },
                      { value: "USD", label: "USD" },
                    ]}
                  />
                </div>
                {p.slug === "free" || p.slug === "unlimited" ? (
                  <input type="hidden" name="availability" value="available" />
                ) : (
                  <div className="labeled-select">
                    <span>Availability</span>
                    <SelectField
                      id={`availability-${p.slug}`}
                      name="availability"
                      ariaLabel="Availability"
                      defaultValue={p.availability}
                      options={[
                        { value: "coming_soon", label: "Coming soon" },
                        { value: "available", label: "Available" },
                      ]}
                    />
                  </div>
                )}
              </div>
              <SubmitButton pendingLabel="Saving…">Save {p.name}</SubmitButton>
            </fieldset>
          </form>
        ))
      )}
    </section>
  );
}
export async function AdminBilling({ canManage }: { canManage: boolean }) {
  const auth = await requireUser();
  if (!auth) return null;
  if (!canManage)
    return <p>Billing is available to administrators and owners.</p>;
  const [config, requests] = await Promise.all([
    auth.supabase.from("billing_settings").select("*").single(),
    auth.supabase
      .from("payment_request_summaries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (config.error || requests.error)
    return (
      <p role="alert">
        Billing data could not be loaded. Refresh before reviewing payments.
      </p>
    );
  const settings = config.data as BillingSettings;
  const payments = requests.data as PaymentRequest[];
  return (
    <>
      <section className="management-section">
        <h2>Payment requests</h2>
        <p>
          Verify the amount, currency, beneficiary, and transfer in your bank or
          wallet before approving. Each approval grants one calendar month;
          duplicate approval is blocked.
        </p>
        {!payments.length ? (
          <p>No payment requests yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Request / account</th>
                  <th>Plan / amount</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <time>{new Date(r.created_at).toLocaleString()}</time>
                      <small>{r.id}</small>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/admin/users/${r.user_id}`} />}
                      >
                        View account
                      </Button>
                    </td>
                    <td>
                      {r.plan_slug}
                      <small>{formatPrice(r.amount_minor, r.currency)}</small>
                      <small>
                        Reference: {r.transfer_reference || "Not submitted"}
                      </small>
                    </td>
                    <td>{r.status.replaceAll("_", " ")}</td>
                    <td>
                      {r.status === "pending" ? (
                        <form
                          action={reviewPayment}
                          className="review-payment-form"
                        >
                          <input type="hidden" name="id" value={r.id} />
                          <label className="sr-only" htmlFor={`note-${r.id}`}>
                            Verification note or rejection reason
                          </label>
                          <Textarea
                            id={`note-${r.id}`}
                            name="note"
                            required
                            minLength={3}
                            maxLength={1000}
                            placeholder="Verification note or rejection reason"
                          />
                          <label className="checkbox-label">
                            <input type="checkbox" name="verified" />I verified
                            receipt of the full amount
                          </label>
                          <div className="action-row">
                            <SubmitButton
                              name="decision"
                              value="approve"
                              pendingLabel="Reviewing…"
                            >
                              Approve
                            </SubmitButton>
                            <SubmitButton
                              name="decision"
                              value="reject"
                              variant="outline"
                              pendingLabel="Reviewing…"
                            >
                              Reject
                            </SubmitButton>
                          </div>
                        </form>
                      ) : (
                        r.review_note || "Awaiting next step"
                      )}
                      <details className="request-details">
                        <summary>Payment instructions at request time</summary>
                        <dl>
                          <dt>Beneficiary</dt>
                          <dd>{r.instructions_snapshot.account_name}</dd>
                          <dt>Bank / wallet</dt>
                          <dd>{r.instructions_snapshot.bank_name}</dd>
                          <dt>Account</dt>
                          <dd>{r.instructions_snapshot.account_number}</dd>
                        </dl>
                        <p className="preserve-lines">
                          {r.instructions_snapshot.instructions}
                        </p>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="management-section">
        <h2>Manual payment setup</h2>
        <p>
          Updates affect new requests. Existing requests keep their original
          amount and payment instructions.
        </p>
        <form action={saveBilling} className="management-form">
          <label className="checkbox-label">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={settings.enabled}
            />
            Accept manual payment requests
          </label>
          <div className="form-grid">
            <label>
              Bank or wallet
              <Input
                name="bankName"
                defaultValue={settings.bank_name}
                maxLength={120}
              />
            </label>
            <label>
              Account / beneficiary name
              <Input
                name="accountName"
                defaultValue={settings.account_name}
                maxLength={160}
              />
            </label>
            <label>
              Account number
              <Input
                name="accountNumber"
                defaultValue={settings.account_number}
                maxLength={100}
              />
            </label>
            <label>
              Support email
              <Input
                type="email"
                name="supportEmail"
                defaultValue={settings.support_email}
                maxLength={254}
              />
            </label>
          </div>
          <label>
            Payment instructions
            <Textarea
              name="instructions"
              defaultValue={settings.instructions}
              maxLength={5000}
              rows={5}
            />
          </label>
          <label>
            Payment QR image
            <Input
              name="qr"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
            <small>
              PNG, JPEG, or WebP. Maximum 750 KB. Check that the QR points to
              the beneficiary above.
            </small>
          </label>
          {settings.qr_image ? (
            <>
              <Image
                unoptimized
                className="payment-qr"
                src={settings.qr_image}
                alt="Current payment QR"
                width={160}
                height={160}
              />
              <label className="checkbox-label">
                <input type="checkbox" name="removeQr" />
                Remove current QR
              </label>
            </>
          ) : null}
          <SubmitButton pendingLabel="Saving…">
            Save payment settings
          </SubmitButton>
        </form>
      </section>
    </>
  );
}
export async function AdminHelp({
  canManage,
  slug,
}: {
  canManage: boolean;
  slug?: string | undefined;
}) {
  const auth = await requireUser();
  if (!auth) return null;
  const { data, error } = await auth.supabase
    .from("help_articles")
    .select("*")
    .order("title");
  if (error) return <p role="alert">Help articles could not be loaded.</p>;
  const articles = data as HelpArticle[];
  const selected = articles.find((a) => a.slug === slug);
  return (
    <section className="management-section">
      <h2>Help articles</h2>
      <p>
        Publish practical guidance beside the product. Article text is displayed
        as plain paragraphs, with no executable markup.
      </p>
      <div className="table-scroll">
        <table className="management-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.slug}>
                <td>
                  {a.title}
                  <small>{a.summary}</small>
                </td>
                <td>{a.published ? "Published" : "Draft"}</td>
                <td>
                  <div className="action-row">
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link href={`/admin?view=help&article=${a.slug}`} />
                      }
                    >
                      Edit
                    </Button>
                    {a.published ? (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/help/${a.slug}`} />}
                      >
                        View
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage ? (
        <form
          key={selected?.slug || "new"}
          action={saveArticle}
          className="management-form"
        >
          <h3>{selected ? "Edit article" : "New article"}</h3>
          <label>
            URL slug
            <Input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={selected?.slug}
              readOnly={!!selected}
            />
          </label>
          <label>
            Title
            <Input
              name="title"
              required
              maxLength={160}
              defaultValue={selected?.title}
            />
          </label>
          <label>
            Summary
            <Input
              name="summary"
              maxLength={400}
              defaultValue={selected?.summary}
            />
          </label>
          <label>
            Article text
            <Textarea
              name="body"
              required
              maxLength={20000}
              rows={12}
              defaultValue={selected?.body}
            />
          </label>
          <label className="checkbox-label">
            <input
              name="published"
              type="checkbox"
              defaultChecked={selected?.published}
            />
            Published
          </label>
          <div className="action-row">
            <SubmitButton pendingLabel="Saving…">Save article</SubmitButton>
            {selected ? (
              <Button
                variant="outline"
                render={<Link href="/admin?view=help" />}
              >
                New article
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
