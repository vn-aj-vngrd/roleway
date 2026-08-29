"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";

function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span className={`skeleton-bone ${className}`} style={style} aria-hidden="true" />;
}

function PageHeading() {
  return (
    <header className="skeleton-heading">
      <div>
        <Bone className="skeleton-title" />
        <Bone className="skeleton-subtitle" />
      </div>
      <Bone className="skeleton-action" />
    </header>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-list-row" key={index}>
          <Bone className="skeleton-icon" />
          <div>
            <Bone className="skeleton-line medium" />
            <Bone className="skeleton-line short" />
          </div>
          <Bone className="skeleton-tag" />
        </div>
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="workspace-page home-v2-page skeleton-page skeleton-home-page">
      <header className="workspace-page-header home-v2-header skeleton-home-page-header">
        <div>
          <Bone className="skeleton-title" />
          <Bone className="skeleton-subtitle" />
        </div>
        <Bone className="skeleton-action" />
      </header>
      <div className="home-v2-layout skeleton-home-layout">
        <main className="home-focus-panel">
          <section className="home-workspace-overview skeleton-home-overview">
            <header className="home-workspace-overview-header">
              <div className="home-workspace-identity">
                <Bone className="skeleton-home-workspace-mark" />
                <Bone className="skeleton-line medium" />
                <Bone className="skeleton-home-key" />
              </div>
              <Bone className="skeleton-home-icon-button" />
            </header>
            <div className="home-workspace-copy">
              <Bone className="skeleton-line long" />
              <Bone className="skeleton-line skeleton-home-description" />
            </div>
          </section>
          <header className="home-section-header skeleton-home-section-header">
            <div>
              <Bone className="skeleton-home-section-title" />
              <Bone className="skeleton-home-count" />
              <Bone className="skeleton-home-count-label" />
            </div>
            <Bone className="skeleton-line long" />
          </header>
          <div className="home-action-groups skeleton-home-groups">
            {[2, 3].map((rows, group) => (
              <section className="workspace-list-group" key={group}>
                <header>
                  <Bone className="skeleton-line short" />
                  <Bone className="skeleton-home-count" />
                </header>
                <div className="workspace-list-group-rows home-action-list">
                  {Array.from({ length: rows }, (_, row) => (
                    <div
                      className="home-action-row"
                      data-group={group ? "upcoming" : "today"}
                      key={row}
                    >
                      {group ? <Bone className="skeleton-time" /> : null}
                      <Bone className="home-action-icon skeleton-home-row-icon" />
                      <div className="home-action-copy">
                        <Bone className="skeleton-line medium" />
                        <Bone className="skeleton-line long" />
                      </div>
                      <Bone className="home-action-arrow skeleton-home-chevron" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
        <aside className="home-context-rail skeleton-home-rail">
          <section className="home-workspace-detail-panel">
            <div className="home-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <div className="skeleton-home-detail-list">
              {Array.from({ length: 5 }, (_, item) => (
                <div key={item}>
                  <Bone className="skeleton-line short" />
                  <Bone className="skeleton-line medium" />
                </div>
              ))}
            </div>
          </section>
          <section className="home-pulse">
            <div className="home-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <div className="skeleton-home-pulse">
              {Array.from({ length: 4 }, (_, item) => (
                <div key={item}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-home-number" />
                </div>
              ))}
            </div>
          </section>
          <section className="home-active-opportunities">
            <div className="home-rail-heading">
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line short" />
            </div>
            <div className="home-opportunity-list">
              {Array.from({ length: 3 }, (_, item) => (
                <div className="skeleton-home-opportunity" key={item}>
                  <Bone className="skeleton-dot" />
                  <span>
                    <Bone className="skeleton-line medium" />
                    <Bone className="skeleton-line long" />
                  </span>
                  <Bone className="skeleton-home-chevron" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="workspace-page inbox-page skeleton-page skeleton-inbox-page">
      <header className="workspace-page-header skeleton-inbox-page-header">
        <div>
          <Bone className="skeleton-title" />
          <Bone className="skeleton-subtitle" />
        </div>
        <Bone className="skeleton-action" />
      </header>
      <div className="workspace-view-toolbar inbox-top-view-toolbar">
        <div className="workspace-view-primary">
          <div className="pill-tabs inbox-view-tabs skeleton-inbox-tabs">
            <Bone className="skeleton-inbox-tab is-wide" />
            <Bone className="skeleton-inbox-tab" />
          </div>
        </div>
        <div className="workspace-view-actions skeleton-collection-controls">
          <Bone className="skeleton-home-icon-button" />
          <Bone className="skeleton-home-icon-button" />
        </div>
      </div>
      <div className="inbox-review-shell">
        <div className="inbox-review-layout">
          <div className="inbox-review-main">
            <section className="inbox-review-intro">
              <Bone className="skeleton-inbox-title" />
              <Bone className="skeleton-inbox-copy" />
            </section>
            <section className="inbox-review-list skeleton-inbox-list">
              <article className="inbox-review-item is-open">
                <div className="inbox-review-row">
                  <Bone className="inbox-company-mark skeleton-inbox-mark" />
                  <span className="inbox-review-row-copy">
                    <Bone className="skeleton-line skeleton-inbox-role" />
                    <Bone className="skeleton-line short" />
                    <Bone className="skeleton-line medium" />
                  </span>
                  <Bone className="skeleton-inbox-chevron" />
                </div>
                <div className="inbox-review-detail">
                  <div className="inbox-review-detail-top">
                    <div className="inbox-review-facts">
                      {Array.from({ length: 4 }, (_, item) => (
                        <div key={item}>
                          <Bone className="skeleton-line short" />
                          <Bone className="skeleton-line medium" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <section className="inbox-review-description">
                    <header>
                      <Bone className="skeleton-line medium" />
                      <Bone className="skeleton-line short" />
                    </header>
                    <div className="skeleton-inbox-description">
                      <Bone className="skeleton-line long" />
                      <Bone className="skeleton-line medium" />
                    </div>
                  </section>
                  <footer className="inbox-review-actions">
                    <Bone className="skeleton-inbox-action is-primary" />
                    <Bone className="skeleton-inbox-action" />
                    <Bone className="skeleton-inbox-action is-dismiss" />
                  </footer>
                </div>
              </article>
              <article className="inbox-review-item">
                <div className="inbox-review-row">
                  <Bone className="inbox-company-mark skeleton-inbox-mark" />
                  <span className="inbox-review-row-copy">
                    <Bone className="skeleton-line medium" />
                    <Bone className="skeleton-line short" />
                    <Bone className="skeleton-line medium" />
                  </span>
                  <Bone className="skeleton-inbox-chevron" />
                </div>
              </article>
            </section>
          </div>
          <aside className="inbox-overview skeleton-inbox-overview">
            <section className="inbox-overview-summary">
              <header>
                <Bone className="skeleton-line medium" />
                <Bone className="skeleton-home-count" />
              </header>
              <dl>
                {Array.from({ length: 3 }, (_, item) => (
                  <div key={item}>
                    <Bone className="skeleton-line medium" />
                    <Bone
                      className={
                        item === 2
                          ? "skeleton-line short"
                          : "skeleton-home-count"
                      }
                    />
                  </div>
                ))}
              </dl>
            </section>
            <section className="inbox-decision-guide">
              <Bone className="skeleton-line medium" />
              <ul>
                {Array.from({ length: 3 }, (_, item) => (
                  <li key={item}>
                    <Bone className="skeleton-dot" />
                    <div>
                      <Bone className="skeleton-line short" />
                      <Bone className="skeleton-line medium" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesSkeletonFrame({
  children,
  view,
}: {
  children: ReactNode;
  view: "board" | "list";
}) {
  return (
    <div
      className="workspace-page board-page has-board skeleton-page skeleton-opportunities-page"
      data-skeleton-view={view}
    >
      <header className="workspace-page-header skeleton-opportunities-header">
        <div className="workspace-page-heading">
          <div>
            <Bone className="skeleton-opportunities-title" />
            <Bone className="skeleton-home-count" />
          </div>
          <Bone className="skeleton-opportunities-context" />
        </div>
        <Bone className="skeleton-opportunities-add" />
      </header>
      <div className="pipeline-controls skeleton-pipeline-controls">
        <div className="pill-tabs pipeline-filters skeleton-pipeline-tabs">
          {[72, 110, 74].map((width) => (
            <Bone className="skeleton-pipeline-tab" key={width} />
          ))}
        </div>
        <div className="pipeline-tools-row">
          {Array.from({ length: 2 }, (_, item) => (
            <Bone className="skeleton-pipeline-tool" key={item} />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function KanbanSkeleton() {
  const cardCounts = [2, 2, 1, 1, 1];
  return (
    <OpportunitiesSkeletonFrame view="board">
      <div className="board-shell skeleton-board-shell">
        <div className="board skeleton-opportunity-board">
          {cardCounts.map((cardCount, column) => (
            <section
              className="board-column skeleton-opportunity-column"
              key={column}
            >
              <div className="column-head skeleton-opportunity-column-head">
                <Bone className="skeleton-opportunity-stage" />
                <Bone className="skeleton-line short" />
                <Bone className="skeleton-home-count" />
              </div>
              <div className="board-card-stack">
                {Array.from({ length: cardCount }, (_, card) => (
                  <article
                    className="opportunity-card skeleton-opportunity-card"
                    key={card}
                  >
                    <div className="opportunity-card-link">
                      <div className="card-topline skeleton-opportunity-topline">
                        <Bone className="skeleton-line skeleton-opportunity-ticket" />
                        <Bone className="skeleton-opportunity-priority" />
                      </div>
                      <Bone className="skeleton-line skeleton-opportunity-role" />
                      <div className="skeleton-opportunity-company">
                        <Bone className="skeleton-line" />
                        <Bone className="skeleton-line" />
                      </div>
                      <div className="card-action">
                        <Bone className="skeleton-opportunity-status" />
                        <span className="skeleton-opportunity-action">
                          <Bone className="skeleton-line" />
                          {card % 2 === 0 ? (
                            <Bone className="skeleton-line" />
                          ) : null}
                        </span>
                      </div>
                      {(card + column) % 2 === 0 ? (
                        <footer className="card-footer">
                          <Bone className="skeleton-opportunity-due" />
                        </footer>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </OpportunitiesSkeletonFrame>
  );
}

function OpportunityListSkeleton() {
  const groupRows = [3, 2, 2];
  return (
    <OpportunitiesSkeletonFrame view="list">
      <div
        className="pipeline-list-view skeleton-opportunity-list"
        aria-hidden="true"
      >
        {groupRows.map((rowCount, group) => (
          <section
            className="pipeline-list-group skeleton-opportunity-list-group"
            key={group}
          >
            <header>
              <Bone className="skeleton-opportunity-list-stage" />
              <Bone className="skeleton-line skeleton-opportunity-list-heading" />
              <Bone className="skeleton-home-count" />
            </header>
            <div>
              {Array.from({ length: rowCount }, (_, row) => (
                <div
                  className="pipeline-list-row skeleton-opportunity-list-row"
                  key={row}
                >
                  <Bone className="skeleton-line skeleton-opportunity-list-id" />
                  <span className="pipeline-list-identity">
                    <Bone className="skeleton-line skeleton-opportunity-list-role" />
                    <Bone className="skeleton-line skeleton-opportunity-list-company" />
                  </span>
                  <Bone className="skeleton-opportunity-list-priority" />
                  <span className="pipeline-list-action">
                    <Bone className="skeleton-line skeleton-opportunity-list-action" />
                  </span>
                  <Bone className="skeleton-line skeleton-opportunity-list-due" />
                  <Bone className="skeleton-opportunity-list-chevron" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </OpportunitiesSkeletonFrame>
  );
}

function OpportunitiesSkeleton() {
  const [view, setView] = useState<"board" | "list">("board");
  useEffect(() => {
    try {
      const preferences = JSON.parse(
        localStorage.getItem("roleway:page-preferences:opportunities:v1") ??
          "null",
      ) as { viewMode?: string } | null;
      setView(preferences?.viewMode === "list" ? "list" : "board");
    } catch {
      /* The default board skeleton remains usable when preferences are unavailable. */
    }
  }, []);
  return view === "list" ? <OpportunityListSkeleton /> : <KanbanSkeleton />;
}

function SettingsSkeleton() {
  return (
    <div className="page settings-page skeleton-page">
      <PageHeading />
      <div className="skeleton-settings">
        <aside>
          {[1, 2, 3, 4, 5].map((item) => (
            <Bone className="skeleton-nav-line" key={item} />
          ))}
        </aside>
        <main>
          <div className="skeleton-profile">
            <Bone className="skeleton-avatar" />
            <div>
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line short" />
            </div>
          </div>
          {[1, 2, 3].map((item) => (
            <div className="skeleton-field" key={item}>
              <Bone className="skeleton-line short" />
              <Bone className="skeleton-input" />
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="skeleton-page">
      <div className="workspace-head skeleton-workspace-head">
        <Bone className="skeleton-line short" />
        <Bone className="skeleton-title" />
        <Bone className="skeleton-subtitle" />
        <div className="skeleton-tabs">
          {[1, 2, 3, 4].map((item) => (
            <Bone className="skeleton-line short" key={item} />
          ))}
        </div>
      </div>
      <div className="workspace-grid">
        <main className="workspace-main">
          <Bone className="skeleton-kicker" />
          {[1, 2, 3, 4].map((item) => (
            <div className="skeleton-detail-row" key={item}>
              <Bone className="skeleton-line short" />
              <Bone className="skeleton-line long" />
            </div>
          ))}
        </main>
        <aside className="context-panel">
          <Bone className="skeleton-kicker" />
          <Bone className="skeleton-line medium" />
          <Bone className="skeleton-line long" />
          <Bone className="skeleton-input" />
        </aside>
      </div>
    </div>
  );
}

function AgentSkeleton() {
  return (
    <div className="agent-native-page is-empty skeleton-page">
      <header className="agent-native-routebar skeleton-agent-routebar">
        <div className="skeleton-agent-switcher">
          <Bone className="skeleton-agent-icon" />
          <Bone className="skeleton-line medium" />
          <Bone className="skeleton-agent-chevron" />
        </div>
        <div className="skeleton-agent-scope">
          <Bone className="skeleton-agent-icon" />
          <Bone className="skeleton-line short" />
        </div>
        <Bone className="skeleton-agent-new" />
      </header>
      <main className="agent-native-workplane">
        <div className="agent-empty-state skeleton-agent-empty">
          <div className="agent-empty-copy">
            <Bone className="skeleton-agent-title" />
            <Bone className="skeleton-line long" />
            <Bone className="skeleton-line medium" />
          </div>
          <div className="agent-prompt-examples">
            {[148, 196, 184].map((width) => (
              <Bone className="skeleton-agent-prompt" key={width} />
            ))}
          </div>
        </div>
        <section className="agent-native-composer skeleton-agent-composer">
          <div className="skeleton-agent-input">
            <Bone className="skeleton-line medium" />
          </div>
          <footer>
            <div className="skeleton-agent-controls">
              <Bone className="skeleton-agent-select" />
              <Bone className="skeleton-agent-select" />
            </div>
            <Bone className="skeleton-line long" />
            <Bone className="skeleton-agent-send" />
          </footer>
        </section>
      </main>
    </div>
  );
}

function ContactsSkeleton() {
  return (
    <div className="workspace-page workspace-index-page contacts-page skeleton-page skeleton-contacts-page">
      <header className="workspace-page-header">
        <div className="workspace-page-heading">
          <div>
            <Bone className="skeleton-title" />
            <Bone className="skeleton-home-count" />
          </div>
          <Bone className="skeleton-subtitle" />
        </div>
        <Bone className="skeleton-action" />
      </header>
      <div className="workspace-view-toolbar">
        <div className="workspace-view-primary skeleton-contacts-tabs">
          <Bone className="skeleton-pipeline-tab" />
          <Bone className="skeleton-pipeline-tab" />
        </div>
        <div className="workspace-view-actions skeleton-collection-controls">
          <Bone className="skeleton-home-icon-button" />
          <Bone className="skeleton-home-icon-button" />
        </div>
      </div>
      <div className="contacts-index-layout">
        <main className="contacts-directory">
          <header className="contacts-directory-header">
            <div>
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line long" />
            </div>
            <Bone className="skeleton-line short" />
          </header>
          <section className="contacts-table">
            {Array.from({ length: 5 }, (_, row) => (
              <div className="contacts-row skeleton-contact-row" key={row}>
                <span className="contact-identity">
                  <Bone className="contact-avatar" />
                  <span>
                    <Bone className="skeleton-line medium" />
                    <Bone className="skeleton-line short" />
                    <Bone className="skeleton-line medium" />
                  </span>
                </span>
                <Bone className="skeleton-tag" />
                <span>
                  <Bone className="skeleton-line short" />
                  <Bone className="skeleton-line medium" />
                </span>
                <Bone className="skeleton-line short" />
                <Bone className="skeleton-home-icon-button" />
              </div>
            ))}
          </section>
        </main>
        <aside className="contacts-insights-rail">
          <section>
            <div className="contacts-rail-heading">
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-home-count" />
            </div>
            <div className="contacts-insight-list">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-home-count" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="contacts-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <Bone className="skeleton-line short" />
            <Bone className="skeleton-line medium" />
            <Bone className="skeleton-line long" />
          </section>
        </aside>
      </div>
    </div>
  );
}

function InterviewsSkeleton() {
  return (
    <div className="workspace-page workspace-index-page interview-index-page skeleton-page skeleton-interviews-page">
      <header className="workspace-page-header">
        <div className="workspace-page-heading">
          <div>
            <Bone className="skeleton-title" />
            <Bone className="skeleton-home-count" />
          </div>
          <Bone className="skeleton-subtitle" />
        </div>
        <Bone className="skeleton-action" />
      </header>
      <div className="workspace-view-toolbar interview-view-toolbar">
        <div className="workspace-view-primary skeleton-interview-tabs">
          {Array.from({ length: 3 }, (_, tab) => (
            <Bone className="skeleton-pipeline-tab" key={tab} />
          ))}
        </div>
        <div className="workspace-view-actions skeleton-collection-controls">
          <Bone className="skeleton-home-icon-button" />
          <Bone className="skeleton-home-icon-button" />
        </div>
      </div>
      <div className="interview-index-layout">
        <main className="interview-schedule">
          <header className="interview-schedule-header">
            <div>
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line long" />
            </div>
            <Bone className="skeleton-line short" />
          </header>
          <div className="interview-groups">
            <section className="workspace-list-group interview-group">
              <header>
                <Bone className="skeleton-line short" />
                <Bone className="skeleton-home-count" />
              </header>
              <div className="document-list interview-list">
                {Array.from({ length: 4 }, (_, row) => (
                  <div
                    className="list-row interview-list-row skeleton-interview-row"
                    key={row}
                  >
                    <span className="interview-date-mark skeleton-interview-date">
                      <Bone className="skeleton-line" />
                      <Bone className="skeleton-line" />
                    </span>
                    <span className="interview-list-copy">
                      <Bone className="skeleton-line medium" />
                      <Bone className="skeleton-line long" />
                    </span>
                    <span className="interview-list-time">
                      <Bone className="skeleton-line medium" />
                      <Bone className="skeleton-line short" />
                    </span>
                    <Bone className="interview-status-badge skeleton-interview-status" />
                    <Bone className="skeleton-opportunity-list-chevron" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
        <aside className="interview-insights-rail">
          <section>
            <div className="interview-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <div className="interview-insight-list">
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-home-count" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="interview-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <div className="skeleton-interview-next">
              <Bone className="skeleton-line long" />
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line long" />
              <Bone className="skeleton-line short" />
            </div>
          </section>
          <section>
            <div className="interview-rail-heading">
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line short" />
            </div>
            <div className="skeleton-interview-checks">
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row}>
                  <Bone className="skeleton-opportunity-status" />
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-line short" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="workspace-page workspace-index-page documents-index-page skeleton-page skeleton-documents-page">
      <header className="workspace-page-header">
        <div className="workspace-page-heading">
          <div>
            <Bone className="skeleton-title" />
            <Bone className="skeleton-home-count" />
          </div>
          <Bone className="skeleton-subtitle" />
        </div>
        <Bone className="skeleton-action" />
      </header>
      <div className="workspace-view-toolbar documents-view-toolbar">
        <div className="workspace-view-primary skeleton-document-tabs">
          <Bone className="skeleton-pipeline-tab" />
          <Bone className="skeleton-pipeline-tab" />
        </div>
        <div className="workspace-view-actions skeleton-collection-controls">
          <Bone className="skeleton-home-icon-button" />
          <Bone className="skeleton-home-icon-button" />
        </div>
      </div>
      <div className="documents-index-layout">
        <main className="documents-library">
          <header className="documents-library-header">
            <div>
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line long" />
            </div>
            <Bone className="skeleton-line short" />
          </header>
          <section className="document-list workspace-document-list">
            <div className="document-list-header" aria-hidden="true">
              <span />
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line short" />
              <Bone className="skeleton-line short" />
              <span />
            </div>
            {Array.from({ length: 5 }, (_, row) => (
              <div className="list-row skeleton-document-row" key={row}>
                <Bone className="list-icon" />
                <span className="document-row-copy">
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-line long" />
                </span>
                <Bone className="skeleton-tag" />
                <Bone className="skeleton-line short" />
                <Bone className="skeleton-opportunity-list-chevron" />
              </div>
            ))}
          </section>
        </main>
        <aside className="documents-insights-rail">
          <section>
            <div className="documents-rail-heading">
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-home-count" />
            </div>
            <div className="documents-insight-list">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-home-count" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="documents-rail-heading">
              <Bone className="skeleton-line medium" />
            </div>
            <div className="skeleton-document-recent">
              <Bone className="skeleton-line long" />
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line long" />
              <Bone className="skeleton-line short" />
            </div>
          </section>
          <section>
            <div className="documents-rail-heading">
              <Bone className="skeleton-line medium" />
              <Bone className="skeleton-line short" />
            </div>
            <div className="skeleton-document-kinds">
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-home-count" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="insights-page skeleton-page skeleton-insights-page">
      <PageHeading />
      <div className="insights-layout">
        <main className="insights-main">
          <section className="insights-summary">
            {Array.from({ length: 4 }, (_, item) => (
              <div key={item}>
                <Bone className="skeleton-number" />
                <Bone className="skeleton-line short" />
              </div>
            ))}
          </section>
          <section className="insight-section">
            <Bone className="skeleton-line short" />
            <Bone className="skeleton-line medium skeleton-insights-copy" />
            <div className="skeleton-insight-signal">
              <Bone className="skeleton-icon" />
              <span>
                <Bone className="skeleton-line medium" />
                <Bone className="skeleton-line long" />
              </span>
            </div>
          </section>
          <section className="insight-section">
            <Bone className="skeleton-line medium" />
            <Bone className="skeleton-line long skeleton-insights-copy" />
            <div className="skeleton-insight-chart">
              {[42, 68, 35, 82, 56, 74].map((height, item) => (
                <Bone style={{ height: `${height}%` }} key={item} />
              ))}
            </div>
          </section>
          <section className="insight-section skeleton-insight-rows">
            <Bone className="skeleton-line medium" />
            <Bone className="skeleton-line long skeleton-insights-copy" />
            {Array.from({ length: 3 }, (_, item) => (
              <div key={item}>
                <Bone className="skeleton-line medium" />
                <Bone className="skeleton-line long" />
                <Bone className="skeleton-tag" />
              </div>
            ))}
          </section>
        </main>
        <aside className="insights-rail skeleton-insights-rail">
          {Array.from({ length: 3 }, (_, section) => (
            <section key={section}>
              <Bone className="skeleton-line medium" />
              {Array.from({ length: section === 1 ? 3 : 4 }, (_, item) => (
                <div key={item}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-number" />
                </div>
              ))}
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="notifications-page skeleton-page skeleton-notifications-page">
      <PageHeading />
      <div className="notifications-layout">
        <main className="notifications-main">
          <div className="notification-filters">
            <Bone className="skeleton-tag" />
            <Bone className="skeleton-tag" />
          </div>
          <div className="skeleton-notification-groups">
            {[3, 2].map((rows, group) => (
              <section className="notification-group" key={group}>
                <header>
                  <Bone className="skeleton-line short" />
                  <Bone className="skeleton-number" />
                </header>
                <div className="notification-list">
                  {Array.from({ length: rows }, (_, row) => (
                    <div className="notification-row" key={row}>
                      <Bone className="skeleton-dot" />
                      <Bone className="skeleton-icon" />
                      <div className="notification-copy">
                        <Bone className="skeleton-line long" />
                        <Bone className="skeleton-line medium" />
                      </div>
                      <Bone className="skeleton-action" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
        <aside className="notifications-rail skeleton-notifications-rail">
          {Array.from({ length: 4 }, (_, section) => (
            <section key={section}>
              <Bone className="skeleton-line medium" />
              {Array.from({ length: section === 3 ? 1 : 3 }, (_, item) => (
                <div key={item}>
                  <Bone className="skeleton-line medium" />
                  <Bone className="skeleton-number" />
                </div>
              ))}
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}

function GenericListSkeleton() {
  return (
    <div className="page narrow skeleton-page">
      <PageHeading />
      <Bone className="skeleton-panel" />
      <ListSkeleton />
    </div>
  );
}

export function WorkspaceLoading() {
  const pathname = usePathname();
  let content;
  if (pathname === "/home") content = <HomeSkeleton />;
  else if (pathname === "/inbox") content = <InboxSkeleton />;
  else if (pathname === "/opportunities") content = <OpportunitiesSkeleton />;
  else if (pathname === "/interview") content = <InterviewsSkeleton />;
  else if (pathname === "/contacts") content = <ContactsSkeleton />;
  else if (pathname === "/documents") content = <DocumentsSkeleton />;
  else if (
    /^\/opportunities\/[^/]+$/.test(pathname) ||
    /^\/documents\/[^/]+$/.test(pathname)
  )
    content = <DetailSkeleton />;
  else if (pathname.startsWith("/settings") || pathname === "/admin")
    content = <SettingsSkeleton />;
  else if (pathname === "/agent") content = <AgentSkeleton />;
  else if (pathname === "/insights") content = <InsightsSkeleton />;
  else if (pathname === "/notifications") content = <NotificationsSkeleton />;
  else content = <GenericListSkeleton />;

  return (
    <div className="workspace-loading" role="status" aria-live="polite">
      <span className="sr-only">Loading workspace</span>
      {content}
    </div>
  );
}

export function GenericLoadingScreen() {
  return (
    <div className="generic-loading" role="status" aria-live="polite">
      <div className="generic-loading-mark">
        <LogoMark tile />
      </div>
      <div>
        <strong>Opening Roleway</strong>
        <span>Preparing your workspace…</span>
      </div>
      <i aria-hidden="true" />
      <span className="sr-only">Loading Roleway</span>
    </div>
  );
}
