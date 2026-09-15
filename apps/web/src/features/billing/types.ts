export type Plan = {
  slug: "free" | "plus" | "pro";
  name: string;
  description: string;
  price_minor: number | null;
  currency: "PHP" | "USD";
  availability: "available" | "coming_soon";
  workspace_limit: number;
  storage_limit_bytes: number;
};
export type Usage = { content_bytes: number; active_workspaces: number };
export type PlanSummary = {
  plan: Plan;
  usage: Usage;
  expires_at: string | null;
};
export type BillingSettings = {
  enabled: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  instructions: string;
  qr_image: string;
  support_email: string;
};
export type PaymentRequest = {
  id: string;
  user_id: string;
  plan_slug: string;
  amount_minor: number;
  currency: string;
  instructions_snapshot: BillingSettings;
  status:
    "awaiting_payment" | "pending" | "approved" | "rejected" | "cancelled";
  transfer_reference: string;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
};
export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  published: boolean;
  updated_at: string;
};
export function formatBytes(value: number) {
  return value < 1024
    ? `${value} B`
    : value < 1048576
      ? `${(value / 1024).toFixed(1)} KiB`
      : `${(value / 1048576).toLocaleString(undefined, { maximumFractionDigits: 1 })} MiB`;
}
export function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
export function capacityError(
  error: { message?: string } | null | undefined,
  fallback: string,
) {
  if (error?.message?.includes("PLAN_WORKSPACE_LIMIT"))
    return "Your plan’s active Workspace limit is reached. Archive an inactive Workspace or open Settings → Plan & billing.";
  if (error?.message?.includes("PLAN_STORAGE_LIMIT"))
    return "Your saved-content limit is reached. Delete unused documents or conversations, or open Settings → Plan & billing.";
  return fallback;
}
