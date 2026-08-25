"use client";

import { ExternalLink, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
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

export function OpportunityDetailsEditor({ opportunityId, importedAt, job }: { opportunityId: string; importedAt: string; job: RoleDetails }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const save = async (formData: FormData) => {
    await updateOpportunityDetails(formData);
    setEditing(false);
    router.refresh();
  };

  if (editing) return <section className="content-section opportunity-details-editor">
    <div className="content-section-head"><div><h2>Edit role</h2><p className="page-subtitle">Update the saved listing and application details.</p></div><button className="button ghost" type="button" onClick={() => setEditing(false)}><X aria-hidden="true" />Cancel</button></div>
    <form action={save}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="jobId" value={job.id} />
      <div className="field-grid">
        <div className="field"><label htmlFor="roleCompany">Company</label><input className="input" id="roleCompany" name="company" required defaultValue={job.company} /></div>
        <div className="field"><label htmlFor="roleTitle">Role title</label><input className="input" id="roleTitle" name="title" required defaultValue={job.title} /></div>
        <div className="field"><label htmlFor="roleLocation">Location</label><input className="input" id="roleLocation" name="location" defaultValue={job.location} /></div>
        <div className="field"><label htmlFor="roleCompensation">Compensation</label><input className="input" id="roleCompensation" name="compensation" defaultValue={job.compensation} /></div>
        <div className="field"><label htmlFor="roleRemotePolicy">Work arrangement</label><input className="input" id="roleRemotePolicy" name="remotePolicy" defaultValue={job.remote_policy} placeholder="Remote, hybrid, or on-site" /></div>
        <div className="field"><label htmlFor="roleSourceUrl">Source URL</label><input className="input" id="roleSourceUrl" name="sourceUrl" type="url" defaultValue={job.source_url ?? ""} placeholder="https://…" /></div>
      </div>
      <div className="field"><label htmlFor="roleApplicationUrl">Application URL</label><input className="input" id="roleApplicationUrl" name="applicationUrl" type="url" defaultValue={job.application_url ?? ""} placeholder="https://…" /></div>
      <div className="field"><label htmlFor="roleDescription">Job description</label><textarea className="textarea role-description-input" id="roleDescription" name="description" defaultValue={job.description} placeholder="Paste the role description…" /></div>
      <div className="opportunity-editor-actions"><SubmitButton pendingLabel="Saving changes…">Save changes</SubmitButton><button className="button secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
    </form>
  </section>;

  return <section className="content-section">
    <div className="content-section-head"><div><h2>Role details</h2><p className="page-subtitle">Imported {new Date(importedAt).toLocaleDateString()}</p></div><div className="content-section-actions">{job.source_url ? <a className="button ghost" href={job.source_url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Open listing</a> : null}<button className="button secondary" type="button" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit details</button></div></div>
    <dl className="opportunity-property-grid">
      <div><dt>Company</dt><dd>{job.company || "Not provided"}</dd></div>
      <div><dt>Location</dt><dd>{job.location || "Not provided"}</dd></div>
      <div><dt>Compensation</dt><dd>{job.compensation || "Not provided"}</dd></div>
      <div><dt>Work arrangement</dt><dd>{job.remote_policy || "Not provided"}</dd></div>
      <div><dt>Source</dt><dd>{job.source || "Not provided"}</dd></div>
      <div><dt>Application</dt><dd>{job.application_url ? <a href={job.application_url} target="_blank" rel="noreferrer">Open application form</a> : "Not provided"}</dd></div>
    </dl>
    <div className="job-description"><div className="job-description-heading"><h3>Job description</h3><button type="button" onClick={() => setEditing(true)}>Edit</button></div>{job.description ? <div className="prose"><p>{job.description}</p></div> : <p className="empty-inline">No job description was saved.</p>}</div>
  </section>;
}
