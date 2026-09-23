"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DateTimeField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/toast";
import { createTask } from "@/features/workspace/actions";

export function OpportunityTaskCreate({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <Button className="related-add-button" variant="outline" type="button" onClick={() => setOpen(true)}><Plus aria-hidden="true" />Add task</Button>;
  }

  const create = async (formData: FormData) => {
    await createTask(formData);
    showToast({ title: "Task added" });
    setOpen(false);
  };

  return <form action={create} className="task-add-composer">
    <input type="hidden" name="opportunityId" value={opportunityId} />
    <label className="sr-only" htmlFor="task-title">Task title</label>
    <input className="input" id="task-title" name="title" required autoComplete="off" autoFocus placeholder="What needs to happen?" />
    <footer>
      <DateTimeField id="taskDueAt" name="dueAt" placeholder="Due date" />
      <div>
        <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
        <SubmitButton pendingLabel="Adding task…"><Plus aria-hidden="true" />Add task</SubmitButton>
      </div>
    </footer>
  </form>;
}
