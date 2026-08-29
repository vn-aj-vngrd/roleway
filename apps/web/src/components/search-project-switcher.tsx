"use client";

import {
  Archive,
  Check,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { WorkspaceMark } from "@/components/workspace-mark";
import {
  archiveSearchProject,
  openSearchProjectSettings,
  switchSearchProject,
  toggleSearchProjectFavorite,
} from "@/features/projects/actions";
import type { SearchProject } from "@/features/projects/context";

export function SearchProjectSwitcher({
  projects,
  activeProject,
  variant = "dropdown",
  children,
}: {
  projects: SearchProject[];
  activeProject: SearchProject;
  variant?: "dropdown" | "sidebar";
  children?:
    ReactNode | ((project: SearchProject, active: boolean) => ReactNode);
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set([activeProject.id]),
  );
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () =>
      setExpandedProjectIds((current) =>
        new Set(current).add(activeProject.id),
      ),
    [activeProject.id],
  );
  useEffect(() => {
    try {
      setFavoriteOverrides(
        JSON.parse(
          localStorage.getItem("roleway-favorite-workspaces") ?? "{}",
        ) as Record<string, boolean>,
      );
    } catch {
      setFavoriteOverrides({});
    }
  }, []);

  const isFavorite = (project: SearchProject) =>
    favoriteOverrides[project.id] ?? project.is_favorite;
  const orderedProjects = useMemo(
    () =>
      [...projects].sort(
        (left, right) =>
          Number(favoriteOverrides[right.id] ?? right.is_favorite) -
          Number(favoriteOverrides[left.id] ?? left.is_favorite),
      ),
    [favoriteOverrides, projects],
  );
  const setFavorite = (projectId: string, favorite: boolean) => {
    setFavoriteOverrides((current) => {
      const next = { ...current, [projectId]: favorite };
      localStorage.setItem("roleway-favorite-workspaces", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!open && !menuProjectId) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMenuProjectId(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMenuProjectId(null);
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [menuProjectId, open]);

  const choose = (projectId: string, returnTo = "/home") => {
    if (projectId === activeProject.id) {
      setOpen(false);
      router.push(returnTo);
      return;
    }
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("returnTo", returnTo);
    setOpen(false);
    startTransition(() => switchSearchProject(formData));
  };

  const toggleExpanded = (projectId: string) =>
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });

  if (variant === "sidebar") {
    return (
      <div
        className="sidebar-search-projects"
        ref={rootRef}
        aria-busy={isPending}
      >
        <header className="sidebar-search-projects-header">
          <button
            type="button"
            aria-expanded={projectsOpen}
            aria-controls="sidebar-search-project-list"
            onClick={() => setProjectsOpen((current) => !current)}
          >
            <span>Workspaces</span>
            <ChevronDown aria-hidden="true" />
          </button>
          <button
            className="sidebar-search-project-create"
            type="button"
            aria-label="Create workspace"
            data-tooltip="New workspace"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("roleway:create-workspace"))
            }
          >
            <Plus aria-hidden="true" />
          </button>
        </header>
        {projectsOpen ? (
          <div
            className="sidebar-search-project-list"
            id="sidebar-search-project-list"
          >
            {orderedProjects.map((project) => {
              const active = project.id === activeProject.id;
              const favorite = isFavorite(project);
              const expanded = expandedProjectIds.has(project.id);
              return (
                <div
                  className={`sidebar-search-project ${active ? "active" : ""}`}
                  key={project.id}
                >
                  <div className="sidebar-search-project-row">
                    <button
                      type="button"
                      className="sidebar-search-project-button"
                      aria-current={active ? "true" : undefined}
                      aria-expanded={expanded}
                      data-tour={active ? "workspace" : undefined}
                      onClick={() => toggleExpanded(project.id)}
                      data-tooltip={project.name}
                    >
                      <WorkspaceMark
                        className="sidebar-search-project-mark"
                        type={project.icon_type}
                        value={project.icon_value}
                        color={project.icon_color}
                      />
                      <span className="sidebar-search-project-name">
                        {project.name}
                      </span>
                      {project.status === "paused" ? (
                        <span className="sidebar-search-project-status">
                          Paused
                        </span>
                      ) : null}
                      <ChevronDown
                        className={`sidebar-search-project-chevron ${expanded ? "open" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      className="sidebar-search-project-more"
                      type="button"
                      aria-label={`Open options for ${project.name}`}
                      data-tooltip="Workspace options"
                      aria-haspopup="menu"
                      aria-expanded={menuProjectId === project.id}
                      onClick={() =>
                        setMenuProjectId((current) =>
                          current === project.id ? null : project.id,
                        )
                      }
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                    {menuProjectId === project.id ? (
                      <div
                        className="sidebar-search-project-menu floating-panel"
                        role="menu"
                        aria-label={`${project.name} options`}
                      >
                        <form
                          action={toggleSearchProjectFavorite}
                          onSubmit={() => {
                            setFavorite(project.id, !favorite);
                            setMenuProjectId(null);
                          }}
                        >
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input
                            type="hidden"
                            name="favorite"
                            value={String(!favorite)}
                          />
                          <button role="menuitem">
                            <Star aria-hidden="true" />
                            {favorite ? "Remove favorite" : "Favorite"}
                          </button>
                        </form>
                        <form action={openSearchProjectSettings}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <button role="menuitem">
                            <Settings aria-hidden="true" />
                            Workspace settings
                          </button>
                        </form>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}/searches/${project.id}`,
                            );
                            setCopiedProjectId(project.id);
                            window.setTimeout(
                              () => setCopiedProjectId(null),
                              1600,
                            );
                          }}
                        >
                          <Copy aria-hidden="true" />
                          {copiedProjectId === project.id
                            ? "Copied"
                            : "Copy URL"}
                        </button>
                        <div className="sidebar-search-project-menu-separator" />
                        <ConfirmationDialog
                          title={`Archive ${project.name}?`}
                          description="This removes the workspace from the sidebar without deleting its jobs, opportunities, documents, or history."
                          action={archiveSearchProject}
                          confirmLabel="Archive workspace"
                          pendingLabel="Archiving…"
                          trigger={
                            <>
                              <Archive aria-hidden="true" />
                              Archive workspace
                            </>
                          }
                          triggerClassName="sidebar-search-project-archive"
                          hiddenFields={{ projectId: project.id }}
                          destructive
                        />
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`sidebar-search-project-navigation ${expanded ? "open" : ""}`}
                    aria-hidden={!expanded}
                    inert={expanded ? undefined : true}
                    onClickCapture={(event) => {
                      if (active) return;
                      const link = (event.target as HTMLElement).closest("a");
                      if (!link) return;
                      event.preventDefault();
                      choose(project.id, link.getAttribute("href") ?? "/home");
                    }}
                  >
                    <div>
                      {typeof children === "function"
                        ? children(project, active)
                        : children}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="search-project-switcher"
      ref={rootRef}
      aria-busy={isPending}
    >
      <button
        className="search-project-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Workspace: ${activeProject.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <WorkspaceMark
          className="search-project-icon"
          type={activeProject.icon_type}
          value={activeProject.icon_value}
          color={activeProject.icon_color}
        />
        <span className="search-project-copy">
          <strong>{activeProject.name}</strong>
          <small>{isPending ? "Switching…" : "Workspace"}</small>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="search-project-menu floating-panel"
          role="menu"
          aria-label="Workspaces"
        >
          <div className="search-project-menu-label">Workspaces</div>
          {orderedProjects.map((project) => (
            <button
              role="menuitemradio"
              aria-checked={project.id === activeProject.id}
              type="button"
              key={project.id}
              onClick={() => choose(project.id)}
            >
              <WorkspaceMark
                type={project.icon_type}
                value={project.icon_value}
                color={project.icon_color}
              />
              <span>
                <strong>{project.name}</strong>
                {project.status === "paused" ? <small>Paused</small> : null}
              </span>
              {project.id === activeProject.id ? (
                <Check aria-hidden="true" />
              ) : null}
            </button>
          ))}
          <div className="search-project-menu-footer">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(
                  new CustomEvent("roleway:create-workspace"),
                );
              }}
            >
              New workspace
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
