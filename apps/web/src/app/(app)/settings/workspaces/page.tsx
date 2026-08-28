import { ChevronRight, Plus, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { CountBadge, PageHeader } from "@/components/ui-primitives";
import { CreateWorkspaceButton } from "@/components/workspace-create-form";
import { WorkspaceMark } from "@/components/workspace-mark";
import { archiveSearchProject, restoreSearchProject } from "@/features/projects/actions";
import { requireSearchContext, type SearchProject } from "@/features/projects/context";

export default async function WorkspaceSettingsPage(props: { searchParams: Promise<{ create?: string; restored?: string; archived?: string; q?: string; error?: string }> }) {
  const [context, query] = await Promise.all([requireSearchContext(), props.searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const { data: archivedData } = await context.supabase
    .from("search_projects")
    .select("id, name, ticket_key, icon_type, icon_value, icon_color, description, objective, status, target_titles, industries, preferred_technologies, employment_types, locations, remote_preference, minimum_compensation, currency, seniority, company_sizes, deal_breakers, preferred_companies, excluded_companies, search_keywords, weekly_application_goal, created_at, updated_at")
    .eq("status", "archived")
    .order("updated_at", { ascending: false });
  const archived = (archivedData ?? []).map((project) => ({ ...project, is_favorite: false })) as SearchProject[];
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  const matchesQuery = (project: SearchProject) => !normalizedQuery || [project.name, project.ticket_key, project.objective, ...project.target_titles].some((value) => value.toLowerCase().includes(normalizedQuery));
  const visibleProjects = context.projects.filter(matchesQuery);
  const visibleArchived = archived.filter(matchesQuery);

  return <div className="page settings-page workspace-settings-index">
    <PageHeader title="Workspaces" description="Keep distinct job-search strategies, identifiers, and records separated." actions={<CreateWorkspaceButton><Plus aria-hidden="true" />New workspace</CreateWorkspaceButton>} />
    <div className="settings-layout">
      <SettingsNav active="Workspaces" />
      <main className="search-settings-main">
        {query.restored ? <div className="form-alert success" role="status">Workspace restored.</div> : null}
        {query.archived ? <div className="form-alert success" role="status">Workspace archived.</div> : null}
        {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}

        <section className="search-project-directory" aria-labelledby="workspaces-heading">
          <header><div><h2 id="workspaces-heading">Workspaces <CountBadge value={visibleProjects.length} /></h2><p>Each Workspace keeps its own focus, Opportunity key, preferences, and history.</p></div><form className="workspace-directory-search" action="/settings/workspaces"><label><Search aria-hidden="true" /><span className="sr-only">Search Workspaces</span><input name="q" defaultValue={query.q ?? ""} placeholder="Search Workspaces…" /></label>{normalizedQuery ? <Link href="/settings/workspaces" aria-label="Clear Workspace search"><X aria-hidden="true" /></Link> : null}</form></header>
          <div className="search-project-list">
            {visibleProjects.map((project) => {
              return <article key={project.id}>
                <Link className="workspace-directory-primary" href={`/settings/workspaces/${project.id}`}>
                  <WorkspaceMark className="search-project-list-icon" type={project.icon_type} value={project.icon_value} color={project.icon_color} />
                  <span className="workspace-directory-copy"><span className="workspace-directory-title"><strong>{project.name}</strong><code>{project.ticket_key}</code></span><small>{project.objective || project.target_titles.join(", ") || "Workspace focus not set"}</small></span>
                </Link>
                <span className="workspace-directory-actions"><Link className="workspace-directory-edit" aria-label={`Edit ${project.name}`} href={`/settings/workspaces/${project.id}`}><ChevronRight aria-hidden="true" /></Link></span>
              </article>;
            })}
            {visibleProjects.length === 0 ? <p className="workspace-directory-empty">No Workspaces match “{query.q}”.</p> : null}
          </div>
        </section>

        {visibleArchived.length ? <section className="form-section archived-searches"><h2>Archived Workspaces</h2><p>Restore a Workspace to return it to the switcher without losing its history.</p>{visibleArchived.map((project) => <div className="archived-search-row" key={project.id}><WorkspaceMark type={project.icon_type} value={project.icon_value} color={project.icon_color} /><span><strong>{project.name}</strong><small>{project.ticket_key} · {project.objective || "Archived Workspace"}</small></span><form action={restoreSearchProject}><input type="hidden" name="projectId" value={project.id} /><SubmitButton className="button secondary" pendingLabel="Restoring…"><RotateCcw aria-hidden="true" />Restore</SubmitButton></form></div>)}</section> : null}

      </main>
    </div>

  </div>;
}
