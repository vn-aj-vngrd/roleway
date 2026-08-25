"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SelectField } from "@/components/form-controls";
import { updateOpportunityStage } from "@/features/workspace/actions";

const stages = ["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"] as const;
type Stage = (typeof stages)[number];

const closedReasons = ["Rejected", "Withdrawn", "No response", "Role closed", "Not interested", "Offer declined", "Accepted", "Other"];

export function OpportunityStageControl({ opportunityId, currentStage }: { opportunityId: string; currentStage: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [needsReason, setNeedsReason] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = (nextStage: Stage, closedReason?: string) => {
    setStage(nextStage);
    setNeedsReason(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunityId", opportunityId);
      formData.set("stage", nextStage);
      formData.set("returnTo", `/opportunities/${opportunityId}`);
      if (closedReason) formData.set("closedReason", closedReason);
      await updateOpportunityStage(formData);
      router.refresh();
    });
  };

  return <div className="opportunity-stage-control" aria-busy={isPending}>
    <label className="stage-control-label" htmlFor="workspace-stage">Status</label>
    <div className="stage-select-row">
    <SelectField
      id="workspace-stage"
      name="stage"
      value={stage}
      disabled={isPending}
      onValueChange={(value) => {
        const nextStage = value as Stage;
        if (nextStage === currentStage) {
          setStage(currentStage);
          setNeedsReason(false);
          return;
        }
        if (nextStage === "closed") {
          setStage(nextStage);
          setNeedsReason(true);
          return;
        }
        save(nextStage);
      }}
      options={stages.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
    />
    {needsReason ? <SelectField
      id="closedReason"
      name="closedReason"
      placeholder="Why did it close?"
      onValueChange={(reason) => reason && save("closed", reason)}
      options={closedReasons.map((label) => ({ value: label, label }))}
    /> : null}
    {isPending ? <span className="stage-saving" role="status">Saving…</span> : null}
    </div>
  </div>;
}
