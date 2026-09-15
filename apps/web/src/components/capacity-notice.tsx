import Link from "next/link";
import type { PlanSummary } from "@/features/billing/types";
export function CapacityNotice({ summary }: { summary: PlanSummary }) {
  const full = summary.usage.content_bytes >= summary.plan.storage_limit_bytes;
  if (
    summary.usage.content_bytes < summary.plan.storage_limit_bytes * 0.8 &&
    summary.usage.active_workspaces <= summary.plan.workspace_limit
  )
    return null;
  return (
    <div className="capacity-notice" role="status">
      <span>
        {full
          ? "Saved-content capacity reached."
          : summary.usage.active_workspaces > summary.plan.workspace_limit
            ? "Your account has more active Workspaces than its plan allows."
            : "You’re approaching your saved-content limit."}{" "}
        Existing records remain available.
      </span>
      <Link href="/settings/billing">Manage plan & usage</Link>
    </div>
  );
}
