"use client";

import { Edit3 } from "lucide-react";
import { useState } from "react";
import { CreateModal } from "@/components/create-modal";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { WorkspaceMark } from "@/components/workspace-mark";
import { WorkspaceComposerFields } from "@/components/workspace-create-form";
import { updateWorkspaceHomeDetails } from "@/features/projects/actions";
import type { SearchProject } from "@/features/projects/context";

function workspaceDetails(project: SearchProject) {
  return [
    { label: "Target roles", value: project.target_titles.join(", ") || "Not set" },
    { label: "Locations", value: project.locations.join(", ") || "Not set" },
    { label: "Industries", value: project.industries.join(", ") || "Not set" },
    { label: "Seniority", value: project.seniority.join(", ") || "Not set" },
    { label: "Work arrangement", value: project.remote_preference === "required" ? "Remote required" : project.remote_preference === "preferred" ? "Remote preferred" : "Flexible" },
  ];
}

export function HomeWorkspaceDetails({ project }: { project: SearchProject }) {
  return <section className="home-workspace-detail-panel" aria-labelledby="home-workspace-details-heading"><div className="home-rail-heading"><h2 id="home-workspace-details-heading">Workspace details</h2></div><dl className="home-workspace-details">{workspaceDetails(project).map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}

export function HomeWorkspaceOverview({ project }: { project: SearchProject }) {
  const [editing, setEditing] = useState(false);

  return <>
    <section className="home-workspace-overview" aria-labelledby="home-workspace-name">
      <header className="home-workspace-overview-header"><div className="home-workspace-identity"><WorkspaceMark type={project.icon_type} value={project.icon_value} color={project.icon_color} /><h2 id="home-workspace-name">{project.name}</h2><code>{project.ticket_key}</code></div><Button className="home-workspace-edit" variant="ghost" size="icon-sm" aria-label="Edit workspace" data-tooltip="Edit workspace" onClick={() => setEditing(true)}><Edit3 aria-hidden="true" /></Button></header>
      <div className="home-workspace-copy"><strong>{project.objective || "Add an objective for this job search"}</strong><p>{project.description || "Describe the strategy, constraints, or outcome that makes this Workspace distinct."}</p></div>
    </section>

    {editing ? <CreateModal title="Edit workspace" description="Update the context shown on Home." context={project.ticket_key} size="compact" hideContext onClose={() => setEditing(false)}><form action={updateWorkspaceHomeDetails} className="modal-create-form workspace-composer-form workspace-edit-form"><input type="hidden" name="projectId" value={project.id} /><WorkspaceComposerFields project={project} /><footer className="composer-footer"><span className="composer-footer-spacer" /><button className="button secondary" type="button" onClick={() => setEditing(false)}>Cancel</button><SubmitButton pendingLabel="Saving…">Save workspace</SubmitButton></footer></form></CreateModal> : null}
  </>;
}
