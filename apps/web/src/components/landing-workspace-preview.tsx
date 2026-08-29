"use client";

import {
  Bell,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  FileText,
  Inbox,
  LayoutDashboard,
  Navigation,
  PanelLeft,
  Plus,
  Search,
  SquarePen,
  Target,
  UserRound,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import {
  PipelineBoard,
  type PipelineOpportunity,
} from "@/components/pipeline-board";
import { WorkspaceMark } from "@/components/workspace-mark";
import { WorkspaceHeader } from "@/components/ui-primitives";

export const landingOpportunities: PipelineOpportunity[] = [
  [
    14,
    "interested",
    "Senior Product Engineer",
    "Northstar Systems",
    "Remote",
    "Review role evidence",
    "2026-09-04T17:00:00.000Z",
  ],
  [
    15,
    "interested",
    "Product Engineer",
    "Fieldwork",
    "New York",
    "Compare compensation",
    null,
  ],
  [
    16,
    "preparing",
    "Frontend Engineer",
    "Atlas Labs",
    "Remote",
    "Choose two project examples",
    "2026-08-30T17:00:00.000Z",
  ],
  [
    17,
    "preparing",
    "Product Engineer",
    "Common Room",
    "Remote",
    "Draft application notes",
    "2026-08-31T17:00:00.000Z",
  ],
  [
    18,
    "applied",
    "Software Engineer",
    "Latticework",
    "Hybrid",
    "Send application follow-up",
    "2026-09-04T17:00:00.000Z",
  ],
].map(([reference, stage, title, company, location, nextAction, due]) => ({
  id: `preview-${reference}`,
  reference_number: reference as number,
  stage: stage as PipelineOpportunity["stage"],
  priority: "medium" as const,
  excitement: null,
  deadline: null,
  next_action: nextAction as string,
  next_action_due_at: due as string | null,
  created_at: "2026-08-20T12:00:00.000Z",
  updated_at: "2026-08-29T12:00:00.000Z",
  jobs: {
    company: company as string,
    title: title as string,
    location: location as string,
    compensation: "",
    source: "Company site",
  },
}));

const globalNavigation = [
  [Navigation, "Agent"],
  [ChartNoAxesColumnIncreasing, "Insights"],
  [Bell, "Notifications"],
] as const;

const workspaceNavigation = [
  [LayoutDashboard, "Home"],
  [Inbox, "Inbox"],
  [Target, "Opportunities"],
  [CalendarClock, "Interviews"],
  [UserRound, "Contacts"],
  [FileText, "Documents"],
] as const;

function PreviewWorkspace({
  name,
  icon,
  color,
  expanded = false,
}: {
  name: string;
  icon: string;
  color: string;
  expanded?: boolean;
}) {
  return (
    <div className={`sidebar-search-project${expanded ? " active" : ""}`}>
      <div className="sidebar-search-project-row">
        <button
          type="button"
          className="sidebar-search-project-button"
          aria-expanded={expanded}
        >
          <WorkspaceMark
            className="sidebar-search-project-mark"
            type="icon"
            value={icon}
            color={color}
          />
          <span className="sidebar-search-project-name">{name}</span>
          <ChevronDown
            className={`sidebar-search-project-chevron${expanded ? " open" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {expanded ? (
        <div className="sidebar-search-project-navigation open">
          <div>
            <nav className="nav-group sidebar-workspace-navigation">
              {workspaceNavigation.map(([Icon, label]) => (
                <span
                  className={`nav-link ${label === "Opportunities" ? "active" : ""}`}
                  key={label}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </span>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LandingWorkspacePreview() {
  return (
    <div
      className="landing-workspace-preview"
      role="img"
      aria-label="Current Roleway opportunities list preview"
    >
      <div
        className="app-shell"
        data-sidebar="expanded"
        aria-hidden="true"
        inert
      >
        <aside className="sidebar">
          <div className="sidebar-brand-row">
            <span className="sidebar-logo">
              <LogoMark tile size={24} />
            </span>
            <div className="sidebar-quick-actions">
              <span className="sidebar-search">
                <Search aria-hidden="true" />
              </span>
              <span className="sidebar-create">
                <SquarePen aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="sidebar-navigation">
            <nav className="nav-group sidebar-primary-nav">
              {globalNavigation.map(([Icon, label]) => (
                <span className="nav-link" key={label}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </span>
              ))}
            </nav>
            <div className="sidebar-search-projects">
              <header className="sidebar-search-projects-header">
                <button type="button">
                  <span>Workspaces</span>
                  <ChevronDown aria-hidden="true" />
                </button>
                <button
                  className="sidebar-search-project-create"
                  type="button"
                  aria-label="Create workspace"
                >
                  <Plus aria-hidden="true" />
                </button>
              </header>
              <div className="sidebar-search-project-list">
                <PreviewWorkspace
                  name="Product engineering"
                  icon="target"
                  color="#5E6AD2"
                  expanded
                />
                <PreviewWorkspace
                  name="Consulting search"
                  icon="compass"
                  color="#10A37F"
                />
                <PreviewWorkspace
                  name="AI product studios"
                  icon="sparkles"
                  color="#8B5CF6"
                />
              </div>
            </div>
          </div>
          <div className="account-area">
            <button className="sidebar-profile" type="button">
              <span className="avatar">JL</span>
              <span className="user-copy">
                <span className="user-name">Jordan Lee</span>
                <span className="user-state">jordan@example.com</span>
              </span>
              <ChevronDown className="account-chevron" aria-hidden="true" />
            </button>
          </div>
        </aside>
        <main className="main">
          <header className="workspace-toolbar">
            <span className="icon-button workspace-sidebar-toggle">
              <PanelLeft aria-hidden="true" />
            </span>
            <span className="workspace-toolbar-separator" />
            <nav className="workspace-breadcrumb">
              <span className="workspace-breadcrumb-project">
                <WorkspaceMark type="icon" value="briefcase" />
                Product engineering
              </span>
              <span className="workspace-breadcrumb-part">
                <span>/</span>
                <strong>Opportunities</strong>
              </span>
            </nav>
            <div className="workspace-toolbar-actions">
              <span className="workspace-route-create">
                <Plus aria-hidden="true" />
                Add job
              </span>
            </div>
          </header>
          <div className="main-content-scroll">
            <div className="workspace-page board-page has-board">
              <WorkspaceHeader
                title="Opportunities"
                count={5}
                context="Every serious role and the Next Action that moves it forward."
              />
              <PipelineBoard
                opportunities={landingOpportunities}
                now="2026-08-29T12:00:00.000Z"
                ticketKey="PROD"
                preferencePage="landing-opportunities-preview"
                previewHref="/signup"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
