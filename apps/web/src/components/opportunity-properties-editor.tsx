"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { showToast } from "@/components/toast";
import { updateOpportunityDetailField } from "@/features/workspace/actions";

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

type DetailField = "company" | "location" | "compensation" | "remotePolicy" | "source" | "sourceUrl" | "applicationUrl";
type DetailState = Record<DetailField, string>;

const labels: Record<DetailField, string> = {
  company: "Company",
  location: "Location",
  compensation: "Compensation",
  remotePolicy: "Arrangement",
  source: "Source",
  sourceUrl: "Listing",
  applicationUrl: "Application",
};

export function OpportunityPropertiesEditor({ opportunityId, job }: { opportunityId: string; job: EditableJob }) {
  const initial: DetailState = { company: job.company, location: job.location, compensation: job.compensation, remotePolicy: job.remote_policy, source: job.source, sourceUrl: job.source_url ?? "", applicationUrl: job.application_url ?? "" };
  const [details, setDetails] = useState(initial);
  const persisted = useRef(initial);
  const [saving, setSaving] = useState<DetailField | null>(null);
  const [, startTransition] = useTransition();

  const save = (field: DetailField) => {
    const value = details[field].trim();
    const previous = persisted.current[field];
    if (value === previous) return;
    setDetails((current) => ({ ...current, [field]: value }));
    setSaving(field);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunityId", opportunityId);
      formData.set("jobId", job.id);
      formData.set("field", field);
      formData.set("value", value);
      const result = await updateOpportunityDetailField(formData);
      setSaving((current) => current === field ? null : current);
      if (!result.success) {
        setDetails((current) => ({ ...current, [field]: previous }));
        showToast({ title: `${labels[field]} was not saved`, description: result.message, tone: "info" });
        return;
      }
      persisted.current = { ...persisted.current, [field]: value };
      showToast({ title: `${labels[field]} updated` });
    });
  };

  const input = (field: DetailField, placeholder: string, type: "text" | "url" = "text") => <input id={`property-${field}`} name={field} type={type} value={details[field]} placeholder={placeholder} aria-label={labels[field]} onChange={(event) => setDetails((current) => ({ ...current, [field]: event.target.value }))} onBlur={() => save(field)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />;

  return <section className="issue-properties-form" aria-busy={saving !== null}>
    <div className="issue-property-row"><label htmlFor="property-company">Company</label>{input("company", "Add company")}</div>
    <div className="issue-property-row"><label htmlFor="property-location">Location</label>{input("location", "Add location")}</div>
    <div className="issue-property-row"><label htmlFor="property-compensation">Compensation</label>{input("compensation", "Add compensation")}</div>
    <div className="issue-property-row"><label htmlFor="property-remotePolicy">Arrangement</label>{input("remotePolicy", "Remote, hybrid…")}</div>
    <div className="issue-property-row"><label htmlFor="property-source">Source</label>{input("source", "Add source")}</div>
    <div className="issue-property-row issue-property-url"><label htmlFor="property-sourceUrl">Listing</label><div>{input("sourceUrl", "Add URL", "url")}{details.sourceUrl ? <a href={details.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open job listing"><ExternalLink aria-hidden="true" /></a> : null}</div></div>
    <div className="issue-property-row issue-property-url"><label htmlFor="property-applicationUrl">Application</label><div>{input("applicationUrl", "Add URL", "url")}{details.applicationUrl ? <a href={details.applicationUrl} target="_blank" rel="noreferrer" aria-label="Open application"><ExternalLink aria-hidden="true" /></a> : null}</div></div>
    {saving ? <span className="role-detail-save-status" aria-live="polite">Saving {labels[saving].toLowerCase()}…</span> : null}
  </section>;
}
