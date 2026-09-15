import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { requestPayment } from "@/features/billing/actions";
import { formatBytes, formatPrice, type Plan } from "@/features/billing/types";
export function PlanComparison({
  plans,
  billing = false,
  enabled = false,
  hasOpenRequest = false,
}: {
  plans: Plan[];
  billing?: boolean;
  enabled?: boolean;
  hasOpenRequest?: boolean;
}) {
  if (!plans.length)
    return (
      <p role="status">
        Plans are temporarily unavailable. Please check back shortly.
      </p>
    );
  return (
    <div className="plan-comparison">
      {plans.map((plan) => (
        <section className="plan-option" key={plan.slug}>
          <div className="plan-option-heading">
            <h3>{plan.name}</h3>
            {plan.availability === "coming_soon" ? (
              <Badge variant="secondary">Coming soon</Badge>
            ) : null}
          </div>
          <p>{plan.description}</p>
          <div className="plan-price">
            {plan.slug === "free" ? (
              "Free"
            ) : plan.availability === "coming_soon" ||
              plan.price_minor === null ? (
              "Pricing to be announced"
            ) : (
              <>
                {formatPrice(plan.price_minor, plan.currency)}{" "}
                <small>/ 30 days</small>
              </>
            )}
          </div>
          <ul>
            <li>
              {plan.workspace_limit} active{" "}
              {plan.workspace_limit === 1 ? "Workspace" : "Workspaces"}
            </li>
            <li>{formatBytes(plan.storage_limit_bytes)} saved content</li>
            <li>Jobs, Opportunities, documents, and interviews</li>
            <li>Optional AI with your own provider</li>
          </ul>
          {plan.availability === "coming_soon" ? (
            <Button variant="outline" disabled>
              Coming soon
            </Button>
          ) : !billing ? (
            <Button
              render={
                <Link
                  href={plan.slug === "free" ? "/signup" : "/settings/billing"}
                />
              }
            >
              {plan.slug === "free" ? "Start with Free" : "View plan"}
            </Button>
          ) : plan.slug !== "free" ? (
            <form action={requestPayment}>
              <input type="hidden" name="plan" value={plan.slug} />
              <SubmitButton
                disabled={!enabled || hasOpenRequest}
                pendingLabel="Creating…"
              >
                {enabled ? "Request this plan" : "Payments unavailable"}
              </SubmitButton>
            </form>
          ) : (
            <p className="muted">Always available when a paid term ends.</p>
          )}
        </section>
      ))}
    </div>
  );
}
