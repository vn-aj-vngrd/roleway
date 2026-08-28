"use client";

import { closedOutcomeReasons, opportunityStageLabels, opportunityStageOrder } from "@roleway/core";
import { Archive, CircleDashed, CircleDot, MessageCircle, Send, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { SelectField } from "@/components/form-controls";
import { showToast } from "@/components/toast";
import { updateOpportunityStageOptimistic } from "@/features/workspace/actions";

const stages = opportunityStageOrder;
type Stage = (typeof stages)[number];

const stagePresentation: Record<Stage, { icon: LucideIcon; tone: string }> = {
  interested: { icon: CircleDot, tone: "neutral" },
  preparing: { icon: CircleDashed, tone: "warning" },
  applied: { icon: Send, tone: "accent" },
  interview: { icon: MessageCircle, tone: "violet" },
  offer: { icon: Trophy, tone: "success" },
  closed: { icon: Archive, tone: "muted" },
};

export function OpportunityStageControl({ opportunityId, currentStage }: { opportunityId: string; currentStage: string }) {
  const [stage, setStage] = useState<Stage>(currentStage as Stage);
  const persistedStage = useRef<Stage>(currentStage as Stage);
  const [needsReason, setNeedsReason] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStage(currentStage as Stage);
    persistedStage.current = currentStage as Stage;
    setNeedsReason(false);
  }, [currentStage]);

  const save = (nextStage: Stage, closedReason?: string) => {
    const previousStage = persistedStage.current;
    setStage(nextStage);
    setNeedsReason(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunityId", opportunityId);
      formData.set("stage", nextStage);
      if (closedReason) formData.set("closedReason", closedReason);
      const result = await updateOpportunityStageOptimistic(formData);
      if (!result.success) {
        setStage(previousStage);
        showToast({ title: "Stage was not updated", description: result.message, tone: "info" });
        return;
      }
      persistedStage.current = nextStage;
      showToast({ title: "Stage updated", description: `Moved to ${opportunityStageLabels[nextStage]}.` });
    });
  };

  return <div className="opportunity-stage-control" data-stage={stage} aria-busy={isPending}>
    <div className="stage-select-row">
    <SelectField
      id="workspace-stage"
      name="stage"
      value={stage}
      ariaLabel="Opportunity stage"
      disabled={isPending}
      onValueChange={(value) => {
        const nextStage = value as Stage;
        if (nextStage === stage) {
          setStage(stage);
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
      options={stages.map((value) => {
        const Icon = stagePresentation[value].icon;
        return { value, label: opportunityStageLabels[value], icon: <Icon aria-hidden="true" />, tone: stagePresentation[value].tone };
      })}
    />
    {needsReason ? <SelectField
      id="closedReason"
      name="closedReason"
      placeholder="Why did it close?"
      ariaLabel="Closed reason"
      onValueChange={(reason) => reason && save("closed", reason)}
      options={closedOutcomeReasons.map((label) => ({ value: label, label }))}
    /> : null}
    <span className="sr-only" role="status" aria-live="polite">{isPending ? "Saving stage…" : ""}</span>
    </div>
  </div>;
}
