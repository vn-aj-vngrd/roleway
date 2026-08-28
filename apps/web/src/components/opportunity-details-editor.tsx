"use client";

import { Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { showToast } from "@/components/toast";
import { updateOpportunityDetails } from "@/features/workspace/actions";

type RoleDetails = {
  id: string;
  company: string;
  title: string;
  description: string;
  location: string;
  compensation: string;
  remote_policy: string;
  source: string;
  source_url: string | null;
  application_url: string | null;
};

export function OpportunityDetailsEditor({ opportunityId, ticket, descriptionHtml, job, navigation, showOverview }: { opportunityId: string; ticket: string; descriptionHtml: string; job: RoleDetails; navigation: ReactNode; showOverview: boolean }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  const save = async (formData: FormData) => {
    await updateOpportunityDetails(formData);
    showToast({ title: "Opportunity updated" });
    setDirty(false);
    router.refresh();
  };

  return <section className="ticket-editor" aria-labelledby="opportunity-title">
    <form action={save} onChange={() => setDirty(true)}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="jobId" value={job.id} />

      <div className="ticket-editor-kicker">
        <span className="mono" translate="no">{ticket}</span>
        <span aria-hidden="true">·</span>
        <span>{job.company}</span>
      </div>
      <label className="sr-only" htmlFor="opportunity-title">Opportunity title</label>
      <input className="ticket-title-input" id="opportunity-title" name="title" required defaultValue={job.title} placeholder="Untitled opportunity" />
      {navigation}

      {showOverview ? <RichTextEditor id="roleDescription" name="description" initialHtml={descriptionHtml} placeholder="Add the role description, responsibilities, and requirements…" className="issue-description-editor" onDirty={() => setDirty(true)} /> : <input type="hidden" name="description" value={job.description} />}

      {showOverview || dirty ? <div className="ticket-editor-toolbar">
        <div className="ticket-editor-meta">
          {showOverview && job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Open listing</a> : null}
        </div>
        <div className="ticket-editor-actions">
          {dirty ? <SubmitButton className="button primary" pendingLabel="Saving…"><Check aria-hidden="true" />Save changes</SubmitButton> : null}
        </div>
      </div> : null}

      <input type="hidden" name="company" value={job.company} />
      <input type="hidden" name="location" value={job.location} />
      <input type="hidden" name="compensation" value={job.compensation} />
      <input type="hidden" name="remotePolicy" value={job.remote_policy} />
      <input type="hidden" name="sourceUrl" value={job.source_url ?? ""} />
      <input type="hidden" name="applicationUrl" value={job.application_url ?? ""} />
    </form>
  </section>;
}
