import { Archive, ArrowLeft, BriefcaseBusiness, ChevronRight, ListChecks, MapPinned, Target } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SettingsNav } from "@/components/settings-nav";
import { PageHeader } from "@/components/ui-primitives";
import { WorkspaceMark } from "@/components/workspace-mark";
import { archiveSearchProject } from "@/features/projects/actions";
import { requireSearchContext } from "@/features/projects/context";

export default async function WorkspaceSettingsOverviewPage(props: { params: Promise<{ id: string }> }) {
  const [context, params] = await Promise.all([requireSearchContext(), props.params]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const project = context.projects.find((candidate) => candidate.id === params.id);
  if (!project) notFound();

  return <div className="page settings-page workspace-settings-overview">
    <PageHeader
      eyebrow={<Link className="settings-parent-link" href="/settings/workspaces"><ArrowLeft aria-hidden="true" />Workspaces</Link>}
      title={<span className="workspace-overview-title"><WorkspaceMark type={project.icon_type} value={project.icon_value} color={project.icon_color} />{project.name}</span>}
      description={<>{project.ticket_key} Opportunity key</>}
    />
    <div className="settings-layout">
      <SettingsNav active="Workspaces" />
      <main className="workspace-settings-overview-main">
        <WorkspaceSettingsGroup title="Workspace">
          <WorkspaceSettingsRow href={`/settings/workspaces/${project.id}/general`} icon={<BriefcaseBusiness />} title="General" description="Name, Opportunity key, objective, and strategy notes" meta={project.ticket_key} />
          <WorkspaceSettingsRow href={`/settings/workspaces/${project.id}/general#role-focus`} icon={<Target />} title="Role focus" description="Target roles, industries, seniority, skills, and company size" meta={project.target_titles.length ? `${project.target_titles.length} roles` : "Not set"} />
        </WorkspaceSettingsGroup>

        <WorkspaceSettingsGroup title="Search criteria">
          <WorkspaceSettingsRow href={`/settings/workspaces/${project.id}/general#location-compensation`} icon={<MapPinned />} title="Location and compensation" description="Remote preference, locations, minimum compensation, and currency" meta={project.remote_preference.replace(/^./, (letter) => letter.toUpperCase())} />
          <WorkspaceSettingsRow href={`/settings/workspaces/${project.id}/general#decision-boundaries`} icon={<ListChecks />} title="Decision boundaries" description="Preferred companies, exclusions, deal breakers, and keywords" meta={project.deal_breakers.length ? `${project.deal_breakers.length} rules` : "Not set"} />
        </WorkspaceSettingsGroup>

        {context.projects.length > 1 ? <WorkspaceSettingsGroup title="Management">
          <div className="workspace-settings-action-row"><span className="workspace-settings-row-icon"><Archive aria-hidden="true" /></span><span><strong>Archive Workspace</strong><small>Remove it from the active switcher while preserving all history</small></span><ConfirmationDialog title={`Archive ${project.name}?`} description="This removes the Workspace from your active list without deleting its records." action={archiveSearchProject} confirmLabel="Archive workspace" pendingLabel="Archiving…" trigger="Archive" triggerClassName="button secondary" hiddenFields={{ projectId: project.id }} /></div>
        </WorkspaceSettingsGroup> : null}
      </main>
    </div>
  </div>;
}

function WorkspaceSettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="workspace-settings-group"><h2>{title}</h2><div>{children}</div></section>;
}

function WorkspaceSettingsRow({ href, icon, title, description, meta }: { href: string; icon: ReactNode; title: string; description: string; meta?: string }) {
  return <Link className="workspace-settings-row" href={href}><span className="workspace-settings-row-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span>{meta ? <em>{meta}</em> : null}<ChevronRight aria-hidden="true" /></Link>;
}
