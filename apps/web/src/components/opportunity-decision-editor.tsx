"use client";

import { useState, useTransition } from "react";
import { DateField, SelectField } from "@/components/form-controls";
import { showToast } from "@/components/toast";
import { updateOpportunityDecisionField } from "@/features/opportunities/actions";

type DecisionField = "priority" | "excitement" | "deadline";
type DecisionState = { priority: string; excitement: string; deadline: string };

const fieldLabels: Record<DecisionField, string> = {
  priority: "Priority",
  excitement: "Excitement",
  deadline: "Application deadline",
};

export function OpportunityDecisionEditor({ opportunityId, priority: initialPriority, excitement: initialExcitement, deadline: initialDeadline }: { opportunityId: string; priority: string; excitement: number | null; deadline: string | null }) {
  const [decision, setDecision] = useState<DecisionState>({ priority: initialPriority, excitement: initialExcitement ? String(initialExcitement) : "", deadline: initialDeadline ?? "" });
  const [savingField, setSavingField] = useState<DecisionField | null>(null);
  const [, startTransition] = useTransition();

  const save = (field: DecisionField, value: string) => {
    const previous = decision[field];
    if (value === previous) return;
    setDecision((current) => ({ ...current, [field]: value }));
    setSavingField(field);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunityId", opportunityId);
      formData.set("field", field);
      formData.set("value", value);
      const result = await updateOpportunityDecisionField(formData);
      setSavingField((current) => current === field ? null : current);
      if (!result.success) {
        setDecision((current) => ({ ...current, [field]: previous }));
        showToast({ title: `${fieldLabels[field]} was not saved`, description: result.message, tone: "info" });
        return;
      }
      showToast({ title: `${fieldLabels[field]} updated` });
    });
  };

  return <section className="ticket-properties opportunity-assessment" aria-busy={savingField !== null}>
    <div className="field"><label htmlFor="priority">Priority</label><SelectField id="priority" name="priority" value={decision.priority} disabled={savingField === "priority"} ariaLabel="Opportunity priority" onValueChange={(value) => save("priority", value)} options={[{ value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} /></div>
    <div className="field"><label htmlFor="excitement">Excitement</label><SelectField id="excitement" name="excitement" value={decision.excitement} disabled={savingField === "excitement"} ariaLabel="Excitement" onValueChange={(value) => save("excitement", value)} options={[{ value: "", label: "Not rated" }, ...[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value} of 5` }))]} /></div>
    <div className="field"><label htmlFor="deadline">Application deadline</label><DateField key={decision.deadline} id="deadline" name="deadline" defaultValue={decision.deadline} onValueChange={(value) => save("deadline", value)} /></div>
    {savingField ? <span className="decision-save-status" aria-live="polite">Saving {fieldLabels[savingField].toLowerCase()}…</span> : null}
  </section>;
}
