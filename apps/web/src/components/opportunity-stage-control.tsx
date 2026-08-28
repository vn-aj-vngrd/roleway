"use client";

import { closedOutcomeReasons, opportunityStageLabels, opportunityStageOrder } from "@roleway/core";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SelectField } from "@/components/form-controls";
import { updateOpportunityStage } from "@/features/workspace/actions";

const stages = opportunityStageOrder;
type Stage = (typeof stages)[number];

export function OpportunityStageControl({ opportunityId, currentStage }: { opportunityId: string; currentStage: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [needsReason, setNeedsReason] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStage(currentStage);
    setNeedsReason(false);
  }, [currentStage]);

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
      ariaLabel="Opportunity stage"
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
      options={stages.map((value) => ({ value, label: opportunityStageLabels[value] }))}
    />
    {needsReason ? <SelectField
      id="closedReason"
      name="closedReason"
      placeholder="Why did it close?"
      ariaLabel="Closed reason"
      onValueChange={(reason) => reason && save("closed", reason)}
      options={closedOutcomeReasons.map((label) => ({ value: label, label }))}
    /> : null}
    {isPending ? <span className="stage-saving" role="status">Saving…</span> : null}
    </div>
  </div>;
}
