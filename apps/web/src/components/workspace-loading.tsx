"use client";

import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo";

function Bone({ className = "" }: { className?: string }) {
  return <span className={`skeleton-bone ${className}`} aria-hidden="true" />;
}

function PageHeading() {
  return <header className="skeleton-heading"><div><Bone className="skeleton-title" /><Bone className="skeleton-subtitle" /></div><Bone className="skeleton-action" /></header>;
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="skeleton-list">{Array.from({ length: rows }, (_, index) => <div className="skeleton-list-row" key={index}><Bone className="skeleton-icon" /><div><Bone className="skeleton-line medium" /><Bone className="skeleton-line short" /></div><Bone className="skeleton-tag" /></div>)}</div>;
}

function HomeSkeleton() {
  return <div className="workspace-page home-v2-page skeleton-page skeleton-home-page">
    <header className="workspace-page-header home-v2-header skeleton-home-page-header"><div><Bone className="skeleton-title" /><Bone className="skeleton-subtitle" /></div><Bone className="skeleton-action" /></header>
    <div className="home-v2-layout skeleton-home-layout">
      <main className="home-focus-panel">
        <section className="home-workspace-overview skeleton-home-overview">
          <header className="home-workspace-overview-header"><div className="home-workspace-identity"><Bone className="skeleton-home-workspace-mark" /><Bone className="skeleton-line medium" /><Bone className="skeleton-home-key" /></div><Bone className="skeleton-home-icon-button" /></header>
          <div className="home-workspace-copy"><Bone className="skeleton-line long" /><Bone className="skeleton-line skeleton-home-description" /></div>
        </section>
        <header className="home-section-header skeleton-home-section-header"><div><Bone className="skeleton-home-section-title" /><Bone className="skeleton-home-count" /></div><Bone className="skeleton-line long" /></header>
        <div className="home-action-groups skeleton-home-groups">{[2, 3].map((rows, group) => <section className="workspace-list-group" key={group}><header><Bone className="skeleton-line short" /><Bone className="skeleton-home-count" /></header><div className="workspace-list-group-rows home-action-list">{Array.from({ length: rows }, (_, row) => <div className="home-action-row" data-group={group ? "upcoming" : "today"} key={row}><Bone className="skeleton-time" /><Bone className="home-action-icon skeleton-home-row-icon" /><div className="home-action-copy"><Bone className="skeleton-line medium" /><Bone className="skeleton-line long" /></div><Bone className="home-action-arrow skeleton-home-chevron" /></div>)}</div></section>)}</div>
      </main>
      <aside className="home-context-rail skeleton-home-rail">
        <section className="home-workspace-detail-panel"><div className="home-rail-heading"><Bone className="skeleton-line medium" /></div><div className="skeleton-home-detail-list">{Array.from({ length: 5 }, (_, item) => <div key={item}><Bone className="skeleton-line short" /><Bone className="skeleton-line medium" /></div>)}</div></section>
        <section className="home-pulse"><div className="home-rail-heading"><Bone className="skeleton-line medium" /></div><div className="skeleton-home-pulse">{Array.from({ length: 4 }, (_, item) => <div key={item}><Bone className="skeleton-line medium" /><Bone className="skeleton-home-number" /></div>)}</div></section>
        <section className="home-active-opportunities"><div className="home-rail-heading"><Bone className="skeleton-line medium" /><Bone className="skeleton-line short" /></div><div className="home-opportunity-list">{Array.from({ length: 3 }, (_, item) => <div className="skeleton-home-opportunity" key={item}><Bone className="skeleton-dot" /><span><Bone className="skeleton-line medium" /><Bone className="skeleton-line long" /></span><Bone className="skeleton-home-chevron" /></div>)}</div></section>
      </aside>
    </div>
  </div>;
}

function BoardSkeleton() {
  return <div className="board-page skeleton-page"><div className="skeleton-board-heading"><PageHeading /></div><div className="skeleton-board-toolbar"><Bone className="skeleton-line short" /><Bone className="skeleton-line short" /></div><div className="skeleton-board">{Array.from({ length: 5 }, (_, column) => <section className="skeleton-column" key={column}><div className="skeleton-column-head"><Bone className="skeleton-dot" /><Bone className="skeleton-line short" /></div>{Array.from({ length: column % 2 ? 2 : 3 }, (_, card) => <div className="skeleton-card" key={card}><Bone className="skeleton-line short" /><Bone className="skeleton-line medium" /><Bone className="skeleton-line long" /><div className="skeleton-card-foot"><Bone className="skeleton-tag" /><Bone className="skeleton-line short" /></div></div>)}</section>)}</div></div>;
}

function SettingsSkeleton() {
  return <div className="page settings-page skeleton-page"><PageHeading /><div className="skeleton-settings"><aside>{[1, 2, 3, 4, 5].map((item) => <Bone className="skeleton-nav-line" key={item} />)}</aside><main><div className="skeleton-profile"><Bone className="skeleton-avatar" /><div><Bone className="skeleton-line medium" /><Bone className="skeleton-line short" /></div></div>{[1, 2, 3].map((item) => <div className="skeleton-field" key={item}><Bone className="skeleton-line short" /><Bone className="skeleton-input" /></div>)}</main></div></div>;
}

function DetailSkeleton() {
  return <div className="skeleton-page"><div className="workspace-head skeleton-workspace-head"><Bone className="skeleton-line short" /><Bone className="skeleton-title" /><Bone className="skeleton-subtitle" /><div className="skeleton-tabs">{[1, 2, 3, 4].map((item) => <Bone className="skeleton-line short" key={item} />)}</div></div><div className="workspace-grid"><main className="workspace-main"><Bone className="skeleton-kicker" />{[1, 2, 3, 4].map((item) => <div className="skeleton-detail-row" key={item}><Bone className="skeleton-line short" /><Bone className="skeleton-line long" /></div>)}</main><aside className="context-panel"><Bone className="skeleton-kicker" /><Bone className="skeleton-line medium" /><Bone className="skeleton-line long" /><Bone className="skeleton-input" /></aside></div></div>;
}

function AgentSkeleton() {
  return <div className="agent-native-page is-empty skeleton-page">
    <header className="agent-native-routebar skeleton-agent-routebar">
      <div className="skeleton-agent-switcher"><Bone className="skeleton-agent-icon" /><Bone className="skeleton-line medium" /><Bone className="skeleton-agent-chevron" /></div>
      <div className="skeleton-agent-scope"><Bone className="skeleton-agent-icon" /><Bone className="skeleton-line short" /></div>
      <Bone className="skeleton-agent-new" />
    </header>
    <main className="agent-native-workplane">
      <div className="agent-empty-state skeleton-agent-empty">
        <div className="agent-empty-copy"><Bone className="skeleton-agent-title" /><Bone className="skeleton-line long" /><Bone className="skeleton-line medium" /></div>
        <div className="agent-prompt-examples">{[148, 196, 184].map((width) => <Bone className="skeleton-agent-prompt" key={width} />)}</div>
      </div>
      <section className="agent-native-composer skeleton-agent-composer">
        <div className="skeleton-agent-input"><Bone className="skeleton-line medium" /></div>
        <footer><div className="skeleton-agent-controls"><Bone className="skeleton-agent-select" /><Bone className="skeleton-agent-select" /></div><Bone className="skeleton-line long" /><Bone className="skeleton-agent-send" /></footer>
      </section>
    </main>
  </div>;
}

function GenericListSkeleton() {
  return <div className="page narrow skeleton-page"><PageHeading /><Bone className="skeleton-panel" /><ListSkeleton /></div>;
}

export function WorkspaceLoading() {
  const pathname = usePathname();
  let content;
  if (pathname === "/home") content = <HomeSkeleton />;
  else if (pathname === "/opportunities") content = <BoardSkeleton />;
  else if (/^\/opportunities\/[^/]+$/.test(pathname) || /^\/documents\/[^/]+$/.test(pathname)) content = <DetailSkeleton />;
  else if (pathname.startsWith("/settings") || pathname === "/admin") content = <SettingsSkeleton />;
  else if (pathname === "/agent") content = <AgentSkeleton />;
  else content = <GenericListSkeleton />;

  return <div className="workspace-loading" role="status" aria-live="polite"><span className="sr-only">Loading workspace</span>{content}</div>;
}

export function GenericLoadingScreen() {
  return <div className="generic-loading" role="status" aria-live="polite"><div className="generic-loading-mark"><LogoMark tile /></div><div><strong>Opening Roleway</strong><span>Preparing your workspace…</span></div><i aria-hidden="true" /><span className="sr-only">Loading Roleway</span></div>;
}
