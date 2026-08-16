"use client";

import { ChevronDown, Ellipsis, Filter, LayoutGrid, ListFilter, Plus, Rows3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { opportunities as initialOpportunities, type Opportunity, type Stage } from "@/lib/data";

const stages: Stage[] = ["Inbox", "Interested", "Preparing", "Applied", "Interview", "Offer", "Closed"];

export function KanbanBoard() {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const grouped = useMemo(() => new Map(stages.map((stage) => [stage, opportunities.filter((item) => item.stage === stage)])), [opportunities]);

  const move = (id: string, stage: Stage) => {
    const current = opportunities.find((item) => item.id === id);
    if (!current || current.stage === stage) return;
    setOpportunities((items) => items.map((item) => item.id === id ? { ...item, stage } : item));
    setAnnouncement(`${current.company} moved to ${stage}`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, textarea, select")) return;
      const index = opportunities.findIndex((item) => item.id === selectedId);
      if (event.key.toLowerCase() === "j") setSelectedId(opportunities[Math.min(index + 1, opportunities.length - 1)]?.id ?? opportunities[0]?.id ?? null);
      if (event.key.toLowerCase() === "k") setSelectedId(opportunities[Math.max(index - 1, 0)]?.id ?? opportunities[0]?.id ?? null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [opportunities, selectedId]);

  return (
    <div className="board-page">
      <header className="page-header">
        <div className="page-header-copy"><h1>Opportunities</h1><p className="page-subtitle">18 active · 3 need action today</p></div>
        <button className="button primary"><Plus />Create opportunity</button>
      </header>
      <div className="toolbar" aria-label="Board controls">
        <button className="button secondary"><LayoutGrid />Active pipeline<ChevronDown /></button>
        <button className="button ghost"><Filter />Filter</button>
        <button className="button ghost"><ListFilter />Sort</button>
        <div className="topbar-spacer" />
        <button className="button ghost"><Rows3 />Compact</button>
      </div>
      <div className="board" aria-label="Opportunity pipeline">
        {stages.map((stage) => {
          const items = grouped.get(stage) ?? [];
          return (
            <section className="board-column" key={stage} aria-labelledby={`stage-${stage}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer.getData("text/opportunity-id"), stage)}>
              <header className="column-head" id={`stage-${stage}`}><span className="status-dot" /><span>{stage}</span><span className="column-count">{items.length}</span><button className="icon-button column-menu" aria-label={`${stage} stage menu`}><Ellipsis /></button></header>
              {items.map((item) => <OpportunityCard key={item.id} item={item} selected={selectedId === item.id} onSelect={() => setSelectedId(item.id)} onMove={move} />)}
              {items.length === 0 ? <p className="faint small" style={{ padding: "14px 6px" }}>Drop an opportunity here</p> : null}
            </section>
          );
        })}
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  );
}

function OpportunityCard({ item, selected, onSelect, onMove }: { item: Opportunity; selected: boolean; onSelect: () => void; onMove: (id: string, stage: Stage) => void }) {
  return (
    <article className={`opportunity-card ${selected ? "selected" : ""}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/opportunity-id", item.id)} onClick={onSelect} tabIndex={0} aria-label={`${item.company}, ${item.role}, ${item.stage}`}>
      <Link href={`/opportunities/${item.id}`}>
        <div className="card-company">{item.company}</div>
        <div className="card-role">{item.role}</div>
        <div className="card-meta">{item.compensation} · {item.location}</div>
        <div className="card-fit"><span className={`fit ${item.fit >= 88 ? "high" : ""}`}>{item.fit}%</span><span className="muted">{item.fitLabel}</span></div>
        <div className="card-action"><span className="status-dot" /><span>{item.date ? `${item.date} · ` : ""}{item.nextAction}</span></div>
        <div className="card-source"><span>{item.source}</span><span>{item.age}</span></div>
      </Link>
      <label className="sr-only" htmlFor={`move-${item.id}`}>Move {item.company} to stage</label>
      <select className="card-stage-select" id={`move-${item.id}`} value={item.stage} onClick={(event) => event.stopPropagation()} onChange={(event) => onMove(item.id, event.target.value as Stage)}>
        {stages.map((stage) => <option key={stage}>{stage}</option>)}
      </select>
    </article>
  );
}
