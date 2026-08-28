"use client";

import { Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateOpportunityDetails } from "@/features/workspace/actions";

type EditableJob = {
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

export function OpportunityPropertiesEditor({ opportunityId, job }: { opportunityId: string; job: EditableJob }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  const save = async (formData: FormData) => {
    await updateOpportunityDetails(formData);
    setDirty(false);
    router.refresh();
  };

  return <form action={save} className="issue-properties-form" onChange={() => setDirty(true)}>
    <input type="hidden" name="opportunityId" value={opportunityId} />
    <input type="hidden" name="jobId" value={job.id} />
    <input type="hidden" name="title" value={job.title} />
    <input type="hidden" name="description" value={job.description} />

    <div className="issue-property-row">
      <label htmlFor="property-company">Company</label>
      <input id="property-company" name="company" required defaultValue={job.company} placeholder="Add company" />
    </div>
    <div className="issue-property-row">
      <label htmlFor="property-location">Location</label>
      <input id="property-location" name="location" defaultValue={job.location} placeholder="Add location" />
    </div>
    <div className="issue-property-row">
      <label htmlFor="property-compensation">Compensation</label>
      <input id="property-compensation" name="compensation" defaultValue={job.compensation} placeholder="Add compensation" />
    </div>
    <div className="issue-property-row">
      <label htmlFor="property-arrangement">Arrangement</label>
      <input id="property-arrangement" name="remotePolicy" defaultValue={job.remote_policy} placeholder="Remote, hybrid…" />
    </div>
    <div className="issue-property-row">
      <label htmlFor="property-source">Source</label>
      <input id="property-source" name="source" defaultValue={job.source} placeholder="Add source" />
    </div>
    <div className="issue-property-row issue-property-url">
      <label htmlFor="property-source-url">Listing</label>
      <div><input id="property-source-url" name="sourceUrl" type="url" defaultValue={job.source_url ?? ""} placeholder="Add URL" />{job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer" aria-label="Open job listing"><ExternalLink aria-hidden="true" /></a> : null}</div>
    </div>
    <div className="issue-property-row issue-property-url">
      <label htmlFor="property-application-url">Application</label>
      <div><input id="property-application-url" name="applicationUrl" type="url" defaultValue={job.application_url ?? ""} placeholder="Add URL" />{job.application_url ? <a href={job.application_url} target="_blank" rel="noreferrer" aria-label="Open application"><ExternalLink aria-hidden="true" /></a> : null}</div>
    </div>

    {dirty ? <div className="issue-properties-save"><SubmitButton className="button primary" pendingLabel="Saving…"><Check aria-hidden="true" />Save changes</SubmitButton></div> : null}
  </form>;
}
