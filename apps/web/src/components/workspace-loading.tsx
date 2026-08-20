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

function TodaySkeleton() {
  return <div className="page narrow skeleton-page"><PageHeading /><div className="skeleton-metrics">{[1, 2, 3, 4].map((item) => <div key={item}><Bone className="skeleton-number" /><Bone className="skeleton-line short" /></div>)}</div><Bone className="skeleton-kicker" /><div className="skeleton-focus-list">{[1, 2, 3].map((item) => <div className="skeleton-focus-row" key={item}><Bone className="skeleton-time" /><span className="skeleton-route" /><div><Bone className="skeleton-line medium" /><Bone className="skeleton-line long" /></div><Bone className="skeleton-action" /></div>)}</div></div>;
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

function AssistantSkeleton() {
  return <div className="page assistant-page skeleton-page"><PageHeading /><div className="assistant-layout"><main className="skeleton-assistant-panel"><Bone className="skeleton-line long" />{[1, 2, 3].map((item) => <div className="skeleton-field" key={item}><Bone className="skeleton-line short" /><Bone className="skeleton-input" /></div>)}</main><aside><Bone className="skeleton-kicker" /><ListSkeleton rows={3} /></aside></div></div>;
}

function GenericListSkeleton() {
  return <div className="page narrow skeleton-page"><PageHeading /><Bone className="skeleton-panel" /><ListSkeleton /></div>;
}

export function WorkspaceLoading() {
  const pathname = usePathname();
  let content;
  if (pathname === "/today") content = <TodaySkeleton />;
  else if (pathname === "/opportunities") content = <BoardSkeleton />;
  else if (/^\/opportunities\/[^/]+$/.test(pathname) || /^\/documents\/[^/]+$/.test(pathname)) content = <DetailSkeleton />;
  else if (pathname.startsWith("/settings") || pathname === "/admin") content = <SettingsSkeleton />;
  else if (pathname === "/assistant") content = <AssistantSkeleton />;
  else content = <GenericListSkeleton />;

  return <div className="workspace-loading" role="status" aria-live="polite"><span className="sr-only">Loading workspace</span>{content}</div>;
}

export function GenericLoadingScreen() {
  return <div className="generic-loading" role="status" aria-live="polite"><div className="generic-loading-mark"><LogoMark /></div><div><strong>Opening Roleway</strong><span>Preparing your workspace…</span></div><i aria-hidden="true" /><span className="sr-only">Loading Roleway</span></div>;
}
