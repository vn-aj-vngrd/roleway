import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui-primitives";
import { WorkspaceSettingsFields } from "@/components/workspace-settings-fields";
import { updateSearchProject } from "@/features/projects/actions";
import { requireSearchContext } from "@/features/projects/context";

export default async function WorkspaceGeneralSettingsPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; focus?: string; section?: string; error?: string }> }) {
  const [context, params, query] = await Promise.all([requireSearchContext(), props.params, props.searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const project = context.projects.find((candidate) => candidate.id === params.id);
  if (!project) notFound();

  return <div className="page settings-page workspace-edit-page workspace-general-page">
    <PageHeader
      eyebrow={<Link className="settings-parent-link" href={`/settings/workspaces/${project.id}`}><ArrowLeft aria-hidden="true" />{project.name}</Link>}
      title="General"
      description={<>Configure this Workspace’s identity, focus, preferences, and decision boundaries.</>}
    />
    <div className="settings-layout">
      <SettingsNav active="Workspaces" />
      <main className="search-settings-main">
        {query.saved ? <div className="form-alert success" role="status">Workspace saved.</div> : null}
        {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}

        <form action={updateSearchProject} className="search-project-form workspace-dedicated-edit-form">
          <input type="hidden" name="projectId" value={project.id} />
          <WorkspaceSettingsFields project={project} focusName={query.focus === "name"} />
          <div className="settings-form-actions"><Link className="button secondary" href={`/settings/workspaces/${project.id}`}>Cancel</Link><SubmitButton pendingLabel="Saving workspace…">Save changes</SubmitButton></div>
        </form>
      </main>
    </div>
  </div>;
}
