"use client";

import { Banknote, BriefcaseBusiness, Building2, Download, Globe2, Link2, MapPin } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SubmitButton } from "@/components/submit-button";
import { inspectJobUrl, type JobUrlCaptureState } from "@/features/capture/actions";
import { createJob } from "@/features/workspace/actions";

const initialCaptureState: JobUrlCaptureState = { status: "idle", message: "", values: null };

export function JobCreateForm({ projectId, projectName, onCancel }: { projectId: string; projectName: string; onCancel?: () => void }) {
  const [capture, captureAction] = useActionState(inspectJobUrl, initialCaptureState);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useEffect(() => setSubmitError(new URLSearchParams(window.location.search).get("error")), []);
  const values = capture.values;
  const formKey = values?.sourceUrl ?? "manual";

  return <div className="job-create-workspace">
    <form key={formKey} className="job-create-form linear-composer" action={createJob}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="composer-editor">
        <label className="sr-only" htmlFor="title">Role title</label>
        <input className="composer-title" id="title" name="title" autoComplete="organization-title" required defaultValue={values?.title ?? ""} placeholder="Role title" autoFocus />
        <label className="sr-only" htmlFor="company">Company</label>
        <div className="composer-company"><Building2 aria-hidden="true" /><input id="company" name="company" autoComplete="organization" required defaultValue={values?.company ?? ""} placeholder="Company" /></div>
        <RichTextEditor key={`description-${formKey}`} id="description" name="description" initialHtml={values?.description ?? ""} placeholder="Add the job description, responsibilities, and requirements…" className="composer-rich-text" />
      </div>

      <section className="job-create-details" aria-labelledby="job-details-heading">
        <header><div><h2 id="job-details-heading">Job details</h2><p>Optional details help you compare and review the role later.</p></div><span>Inbox</span></header>
        <div className="job-create-detail-grid">
          <label><span><MapPin aria-hidden="true" />Location</span><input id="location" name="location" autoComplete="address-level2" defaultValue={values?.location ?? ""} placeholder="City, country, or remote" /></label>
          <label><span><Banknote aria-hidden="true" />Compensation</span><input id="compensation" name="compensation" defaultValue={values?.compensation ?? ""} placeholder="$140k–$175k" /></label>
          <label><span><Globe2 aria-hidden="true" />Work arrangement</span><input id="remotePolicy" name="remotePolicy" defaultValue={values?.remotePolicy ?? ""} placeholder="Remote, hybrid, or onsite" /></label>
        </div>
        <div className="job-create-url-fields">
          <label><span><Link2 aria-hidden="true" />Job URL</span><div><input id="sourceUrl" name="sourceUrl" type="url" inputMode="url" defaultValue={values?.sourceUrl ?? ""} placeholder="https://company.com/jobs/…" /><SubmitButton className="job-url-import" pendingLabel="Importing…" formAction={captureAction}><Download aria-hidden="true" />Import details</SubmitButton></div></label>
          <label><span><BriefcaseBusiness aria-hidden="true" />Application URL <small>Optional</small></span><input id="applicationUrl" name="applicationUrl" type="url" inputMode="url" defaultValue={values?.applicationUrl ?? ""} placeholder="https://company.com/apply/…" /></label>
        </div>
        <input type="hidden" name="datePosted" value={values?.datePosted ?? ""} />
      </section>

      {capture.status !== "idle" ? <div className={`capture-url-result ${capture.status}`} role={capture.status === "error" ? "alert" : "status"}>{capture.message}</div> : null}
      {submitError ? <div className="capture-url-result error" role="alert">{submitError}</div> : null}

      <footer className="composer-footer">
        <span className="composer-save-note">Save to {projectName} Inbox</span>
        {onCancel ? <button className="button secondary" type="button" onClick={onCancel}>Cancel</button> : null}
        <SubmitButton pendingLabel="Saving…">Save job</SubmitButton>
      </footer>
    </form>
  </div>;
}
