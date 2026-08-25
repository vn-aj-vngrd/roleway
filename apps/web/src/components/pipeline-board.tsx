"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SelectField } from "@/components/form-controls";
import { updateOpportunityStage } from "@/features/workspace/actions";

const stages = ["inbox", "interested", "preparing", "applied", "interview", "offer", "closed"] as const;
type Stage = (typeof stages)[number];

const labels: Record<Stage, string> = {
  inbox: "Inbox",
  interested: "Interested",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export type PipelineOpportunity = {
  id: string;
  reference_number: number;
  stage: Stage;
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  jobs: { company: string; title: string; location: string; compensation: string; source: string } | null;
};

function dueLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const overdue = date.getTime() < Date.now();
  return { overdue, text: `${overdue ? "Overdue" : "Due"} ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}` };
}

export function PipelineBoard({ opportunities }: { opportunities: PipelineOpportunity[] }) {
  const router = useRouter();
  const [items, setItems] = useState(opportunities);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [closing, setClosing] = useState<PipelineOpportunity | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeDialog = useRef<HTMLDialogElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: 0, width: 100, overflow: false });

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const updateScrollState = () => {
      const scrollableWidth = Math.max(board.scrollWidth - board.clientWidth, 0);
      setScrollState({
        left: scrollableWidth ? (board.scrollLeft / board.scrollWidth) * 100 : 0,
        width: Math.min((board.clientWidth / board.scrollWidth) * 100, 100),
        overflow: scrollableWidth > 2,
      });
    };
    updateScrollState();
    board.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(board);
    return () => { board.removeEventListener("scroll", updateScrollState); observer.disconnect(); };
  }, [items]);

  const scrollFromOverview = (clientX: number, target: HTMLDivElement) => {
    const board = boardRef.current;
    if (!board) return;
    const bounds = target.getBoundingClientRect();
    const position = Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1);
    board.scrollTo({ left: position * board.scrollWidth - board.clientWidth / 2, behavior: "smooth" });
  };

  const move = (item: PipelineOpportunity, stage: Stage, closedReason?: string) => {
    if (item.stage === stage) return;
    if (stage === "closed" && !closedReason) {
      setClosing(item);
      requestAnimationFrame(() => closeDialog.current?.showModal());
      return;
    }
    const previous = items;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, stage } : candidate));
    setAnnouncement(`${item.jobs?.title ?? "Opportunity"} moved to ${labels[stage]}.`);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunityId", item.id);
      formData.set("stage", stage);
      formData.set("returnTo", "/opportunities");
      if (closedReason) formData.set("closedReason", closedReason);
      try {
        await updateOpportunityStage(formData);
        router.refresh();
      } catch {
        setItems(previous);
        setAnnouncement("The opportunity could not be moved. Try again.");
      }
    });
  };

  const moveByKeyboard = (item: PipelineOpportunity, direction: -1 | 1) => {
    const current = stages.indexOf(item.stage);
    const next = stages[current + direction];
    if (next) move(item, next);
  };

  return <>
    <div className="board-shell">
      <div ref={boardRef} id="pipeline-board" className="board" aria-label="Opportunity pipeline" aria-busy={isPending}>
        {stages.map((stage) => {
        const stageItems = items.filter((item) => item.stage === stage);
        return <section
          className={`board-column ${overStage === stage ? "is-drop-target" : ""}`}
          data-stage={stage}
          key={stage}
          onDragEnter={(event) => { event.preventDefault(); setOverStage(stage); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverStage(null); }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData("text/plain") || draggedId;
            const item = items.find((candidate) => candidate.id === id);
            setOverStage(null);
            setDraggedId(null);
            if (item) move(item, stage);
          }}
        >
          <header className="column-head"><span className="stage-marker" aria-hidden="true" /><span>{labels[stage]}</span><span className="column-count">{stageItems.length}</span></header>
          <div className="board-card-stack">
            {stageItems.map((item) => {
              const due = dueLabel(item.next_action_due_at);
              return <article
                className={`opportunity-card ${draggedId === item.id ? "is-dragging" : ""}`}
                draggable
                key={item.id}
                tabIndex={0}
                aria-label={`${item.jobs?.title ?? "Opportunity"} at ${item.jobs?.company ?? "unknown company"}. Stage ${labels[item.stage]}. Drag to another stage, or use Alt and arrow keys.`}
                onDragStart={(event) => {
                  setDraggedId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragEnd={() => { setDraggedId(null); setOverStage(null); }}
                onKeyDown={(event) => {
                  if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
                  event.preventDefault();
                  moveByKeyboard(item, event.key === "ArrowLeft" ? -1 : 1);
                }}
              >
                <Link className="opportunity-card-link" href={`/opportunities/${item.id}`} draggable={false}>
                  <div className="card-topline"><span className="card-company">{item.jobs?.company ?? "Unknown company"}</span><ArrowUpRight aria-hidden="true" /></div>
                  <div className="card-role">{item.jobs?.title ?? "Untitled role"}</div>
                  <div className="card-meta">{[item.jobs?.location, item.jobs?.compensation].filter(Boolean).join(" · ") || "Details not added"}</div>
                  <div className="card-action"><span className="status-dot" /><span>{item.next_action || "Set a next action"}</span></div>
                  <div className="card-source"><span className="mono">RLW-{String(item.reference_number).padStart(3, "0")}</span>{due ? <time className={due.overdue ? "overdue" : ""}>{due.text}</time> : <span>{item.jobs?.source || "Manual"}</span>}</div>
                </Link>
              </article>;
            })}
            {stageItems.length === 0 ? <div className="board-empty"><span />Drop an opportunity here</div> : null}
          </div>
          </section>;
        })}
      </div>
      {scrollState.overflow ? <div
        className="pipeline-minimap"
        role="scrollbar"
        aria-label="Pipeline position"
        aria-controls="pipeline-board"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(scrollState.left)}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          scrollFromOverview(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) scrollFromOverview(event.clientX, event.currentTarget);
        }}
        onPointerUp={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && event.currentTarget.releasePointerCapture(event.pointerId)}
        onPointerCancel={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && event.currentTarget.releasePointerCapture(event.pointerId)}
        onKeyDown={(event) => {
          const board = boardRef.current;
          if (!board || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          event.preventDefault();
          board.scrollBy({ left: event.key === "ArrowLeft" ? -board.clientWidth * .65 : board.clientWidth * .65, behavior: "smooth" });
        }}
      >
        {stages.map((stage) => <span key={stage} data-stage={stage} />)}
        <i className="pipeline-minimap-window" style={{ left: `${scrollState.left}%`, width: `${scrollState.width}%` }} />
      </div> : null}
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <dialog className="confirmation-dialog pipeline-close-dialog" ref={closeDialog} onClose={() => setClosing(null)}>
      <form method="dialog" onSubmit={(event) => {
        const reason = new FormData(event.currentTarget).get("closedReason");
        if (!closing || typeof reason !== "string" || !reason) return;
        move(closing, "closed", reason);
      }}>
        <span className="section-label">Close opportunity</span>
        <h2>Why is this opportunity closing?</h2>
        <p>This reason stays in the opportunity history.</p>
        <div className="field"><label htmlFor="pipelineClosedReason">Reason</label><SelectField id="pipelineClosedReason" name="closedReason" required placeholder="Choose a reason…" options={["Rejected", "Withdrawn", "No response", "Role closed", "Not interested", "Offer declined", "Accepted", "Other"].map((label) => ({ value: label, label }))} /></div>
        <div><button className="button secondary" type="button" onClick={() => closeDialog.current?.close()}>Cancel</button><button className="button primary" value="confirm">Move to closed</button></div>
      </form>
    </dialog>
  </>;
}
