"use client";

import {
  closedOutcomeReasons,
  formatOpportunityTicket,
  opportunityStageLabels,
  opportunityStageOrder,
} from "@roleway/core";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Columns3,
  List,
  ListFilter,
  LoaderCircle,
  MessageCircle,
  Search,
  Send,
  SlidersHorizontal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { SelectField } from "@/components/form-controls";
import { Button } from "@/components/ui/button";
import { CountBadge, PillTabButtons } from "@/components/ui-primitives";
import { usePagePreferences } from "@/components/use-page-preferences";
import {
  compareOpportunityPriority,
  opportunityAttentionReasons,
} from "@/features/opportunities/model";
import { updateOpportunityStage } from "@/features/workspace/actions";

const stages = opportunityStageOrder;
const activeStages = stages.filter((stage) => stage !== "closed");
type Stage = (typeof stages)[number];
export type PipelineFilter = "active" | "attention" | "closed";
type PriorityFilter = "all" | PipelineOpportunity["priority"];
type DueFilter = "all" | "overdue" | "unscheduled";
type ViewMode = "list" | "board";
type SortOrder = "priority" | "updated" | "deadline" | "company";
type PipelinePreferences = {
  filter: PipelineFilter;
  priority: PriorityFilter;
  due: DueFilter;
  viewMode: ViewMode;
  sort: SortOrder;
  query: string;
};

const defaultPipelinePreferences: PipelinePreferences = {
  filter: "active",
  priority: "all",
  due: "all",
  viewMode: "list",
  sort: "priority",
  query: "",
};
const legacyPipelinePreferenceKey = "roleway-opportunity-preferences:v1";
const obsoletePipelinePreferenceKeys = [
  "roleway-opportunity-views:v1",
] as const;
const pipelineFilters: readonly PipelineFilter[] = [
  "active",
  "attention",
  "closed",
];
const priorityFilters: readonly PriorityFilter[] = [
  "all",
  "low",
  "medium",
  "high",
  "urgent",
];
const dueFilters: readonly DueFilter[] = ["all", "overdue", "unscheduled"];
const viewModes: readonly ViewMode[] = ["list", "board"];
const sortOrders: readonly SortOrder[] = [
  "priority",
  "updated",
  "deadline",
  "company",
];

function normalizePipelinePreferences(
  stored: unknown,
  defaults: PipelinePreferences,
): PipelinePreferences {
  if (!stored || typeof stored !== "object") return defaults;
  const value = stored as Partial<PipelinePreferences>;
  return {
    filter: pipelineFilters.includes(value.filter as PipelineFilter)
      ? (value.filter as PipelineFilter)
      : defaults.filter,
    priority: priorityFilters.includes(value.priority as PriorityFilter)
      ? (value.priority as PriorityFilter)
      : defaults.priority,
    due: dueFilters.includes(value.due as DueFilter)
      ? (value.due as DueFilter)
      : defaults.due,
    viewMode: viewModes.includes(value.viewMode as ViewMode)
      ? (value.viewMode as ViewMode)
      : defaults.viewMode,
    sort: sortOrders.includes(value.sort as SortOrder)
      ? (value.sort as SortOrder)
      : defaults.sort,
    query:
      typeof value.query === "string"
        ? value.query.slice(0, 120)
        : defaults.query,
  };
}

const stageDetails: Record<Stage, { label: string; icon: LucideIcon }> = {
  interested: { label: opportunityStageLabels.interested, icon: CircleDot },
  preparing: { label: opportunityStageLabels.preparing, icon: LoaderCircle },
  applied: { label: opportunityStageLabels.applied, icon: Send },
  interview: { label: opportunityStageLabels.interview, icon: MessageCircle },
  offer: { label: opportunityStageLabels.offer, icon: Trophy },
  closed: { label: opportunityStageLabels.closed, icon: Archive },
};

export type PipelineOpportunity = {
  id: string;
  reference_number: number;
  stage: Stage;
  priority: "low" | "medium" | "high" | "urgent";
  excitement: number | null;
  deadline: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  created_at: string;
  updated_at: string;
  jobs: {
    company: string;
    title: string;
    location: string;
    compensation: string;
    source: string;
  } | null;
};

function dueLabel(value: string | null, now: Date) {
  if (!value) return null;
  const date = new Date(value);
  const overdue = date.getTime() < now.getTime();
  return {
    overdue,
    text: `${overdue ? "Overdue" : "Due"} ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`,
  };
}

export function PipelineBoard({
  opportunities,
  now,
  ticketKey,
  initialFilter,
  preferencePage = "opportunities",
  previewHref,
}: {
  opportunities: PipelineOpportunity[];
  now: string;
  ticketKey: string;
  initialFilter?: PipelineFilter;
  preferencePage?: string;
  previewHref?: string;
}) {
  const ticketNumber = useCallback(
    (item: PipelineOpportunity) =>
      formatOpportunityTicket(ticketKey, item.reference_number),
    [ticketKey],
  );
  const router = useRouter();
  const [items, setItems] = useState(opportunities);
  const referenceTime = useMemo(() => new Date(now), [now]);
  const normalizePreferences = useCallback(
    (stored: unknown, defaults: PipelinePreferences) => {
      const normalized = normalizePipelinePreferences(stored, defaults);
      return initialFilter
        ? {
            ...normalized,
            filter: initialFilter,
            priority: "all" as const,
            due: "all" as const,
          }
        : normalized;
    },
    [initialFilter],
  );
  const { preferences, setPreferences } = usePagePreferences({
    page: preferencePage,
    defaults: defaultPipelinePreferences,
    normalize: normalizePreferences,
    migrateFromKey: legacyPipelinePreferenceKey,
    cleanupKeys: obsoletePipelinePreferenceKeys,
  });
  const {
    filter,
    priority: priorityFilter,
    due: dueFilter,
    viewMode,
    sort: sortOrder,
    query,
  } = preferences;
  const setPreference = <Key extends keyof PipelinePreferences>(
    key: Key,
    value: PipelinePreferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const draggedIdRef = useRef<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [closing, setClosing] = useState<PipelineOpportunity | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeDialog = useRef<HTMLDialogElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const displayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen && !displayOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!filterMenuRef.current?.contains(target)) setFilterOpen(false);
      if (!displayMenuRef.current?.contains(target)) setDisplayOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterOpen(false);
        setDisplayOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [displayOpen, filterOpen]);

  const counts = useMemo(
    () => ({
      active: items.filter((item) => item.stage !== "closed").length,
      attention: items.filter(
        (item) => opportunityAttentionReasons(item, referenceTime).length > 0,
      ).length,
      closed: items.filter((item) => item.stage === "closed").length,
    }),
    [items, referenceTime],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (filter === "active" && item.stage === "closed") return false;
        if (
          filter === "attention" &&
          opportunityAttentionReasons(item, referenceTime).length === 0
        )
          return false;
        if (filter === "closed" && item.stage !== "closed") return false;
        if (priorityFilter !== "all" && item.priority !== priorityFilter)
          return false;
        if (
          dueFilter === "overdue" &&
          (!item.next_action_due_at ||
            new Date(item.next_action_due_at).getTime() >=
              referenceTime.getTime())
        )
          return false;
        if (dueFilter === "unscheduled" && item.next_action_due_at)
          return false;
        if (!normalizedQuery) return true;
        return [
          ticketNumber(item),
          item.jobs?.title,
          item.jobs?.company,
          item.jobs?.location,
          item.next_action,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sortOrder === "priority")
          return compareOpportunityPriority(left, right);
        if (sortOrder === "updated")
          return (
            new Date(right.updated_at).getTime() -
            new Date(left.updated_at).getTime()
          );
        if (sortOrder === "deadline") {
          const leftDeadline = left.deadline
            ? new Date(`${left.deadline}T23:59:59`).getTime()
            : Number.MAX_SAFE_INTEGER;
          const rightDeadline = right.deadline
            ? new Date(`${right.deadline}T23:59:59`).getTime()
            : Number.MAX_SAFE_INTEGER;
          return (
            leftDeadline - rightDeadline ||
            compareOpportunityPriority(left, right)
          );
        }
        return (
          (left.jobs?.company ?? "").localeCompare(right.jobs?.company ?? "") ||
          (left.jobs?.title ?? "").localeCompare(right.jobs?.title ?? "")
        );
      });
  }, [
    dueFilter,
    filter,
    items,
    priorityFilter,
    query,
    referenceTime,
    sortOrder,
    ticketNumber,
  ]);

  const visibleStages: readonly Stage[] =
    filter === "closed" ? ["closed"] : activeStages;
  const activeFilterCount =
    Number(priorityFilter !== "all") +
    Number(dueFilter !== "all") +
    Number(Boolean(query.trim()));

  const move = (
    item: PipelineOpportunity,
    stage: Stage,
    closedReason?: string,
  ) => {
    if (item.stage === stage) return;
    if (stage === "closed" && !closedReason) {
      setClosing(item);
      requestAnimationFrame(() => closeDialog.current?.showModal());
      return;
    }
    const previous = items;
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, stage } : candidate,
      ),
    );
    setAnnouncement(
      `${item.jobs?.title ?? "Opportunity"} moved to ${stageDetails[stage].label}.`,
    );
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

  return (
    <>
      <div className="pipeline-controls" aria-label="Opportunity views">
        <PillTabButtons
          className="pipeline-filters"
          label="Filter opportunities"
          items={pipelineFilters.map((value) => ({
            value,
            label:
              value === "active"
                ? "Active"
                : value === "attention"
                  ? "Needs action"
                  : "Closed",
            active: filter === value,
            count: counts[value],
          }))}
          onChange={(value) => setPreference("filter", value)}
        />

        <div
          className="pipeline-tools-row"
          aria-label="Filter and display options"
        >
          <div className="pipeline-filter-menu" ref={filterMenuRef}>
            <button
              type="button"
              className={`pipeline-control-button ${activeFilterCount ? "active" : ""}`}
              aria-label="Filter opportunities"
              data-tooltip="Filter"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => {
                setFilterOpen((open) => !open);
                setDisplayOpen(false);
              }}
            >
              <ListFilter aria-hidden="true" />
              {activeFilterCount ? (
                <CountBadge
                  className="pipeline-control-count"
                  tone="accent"
                  label={`${activeFilterCount} active filters`}
                  value={activeFilterCount}
                />
              ) : null}
            </button>
            {filterOpen ? (
              <div
                className="pipeline-popover pipeline-filter-popover floating-panel"
                role="dialog"
                aria-label="Filter opportunities"
              >
                <label className="pipeline-popover-search">
                  <Search aria-hidden="true" />
                  <span className="sr-only">Search opportunities</span>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                      setPreference("query", event.target.value);
                    }}
                    placeholder="Search opportunities…"
                  />
                </label>
                <section>
                  <span>Priority</span>
                  <div>
                    {(["all", "urgent", "high", "medium", "low"] as const).map(
                      (value) => (
                        <button
                          type="button"
                          className={priorityFilter === value ? "active" : ""}
                          key={value}
                          onClick={() => {
                            setPreference("priority", value);
                          }}
                        >
                          {value === "all"
                            ? "Any priority"
                            : value.charAt(0).toUpperCase() + value.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </section>
                <section>
                  <span>Due date</span>
                  <div>
                    {(["all", "overdue", "unscheduled"] as const).map(
                      (value) => (
                        <button
                          type="button"
                          className={dueFilter === value ? "active" : ""}
                          key={value}
                          onClick={() => {
                            setPreference("due", value);
                          }}
                        >
                          {value === "all"
                            ? "Any due date"
                            : value === "overdue"
                              ? "Overdue"
                              : "No due date"}
                        </button>
                      ),
                    )}
                  </div>
                </section>
                {activeFilterCount || query ? (
                  <button
                    type="button"
                    className="pipeline-clear-filters"
                    onClick={() => {
                      setPreferences((current) => ({
                        ...current,
                        priority: "all",
                        due: "all",
                        query: "",
                      }));
                    }}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="pipeline-display-menu" ref={displayMenuRef}>
            <button
              type="button"
              className="pipeline-control-button"
              aria-label="Display options"
              data-tooltip="Display"
              aria-haspopup="dialog"
              aria-expanded={displayOpen}
              onClick={() => {
                setDisplayOpen((open) => !open);
                setFilterOpen(false);
              }}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
            {displayOpen ? (
              <div
                className="pipeline-popover pipeline-display-popover floating-panel"
                role="dialog"
                aria-label="Opportunity display options"
              >
                <div
                  className="pipeline-view-toggle"
                  aria-label="Opportunity layout"
                >
                  <button
                    type="button"
                    className={viewMode === "list" ? "active" : ""}
                    aria-pressed={viewMode === "list"}
                    onClick={() => {
                      setPreference("viewMode", "list");
                    }}
                  >
                    <List aria-hidden="true" />
                    List
                  </button>
                  <button
                    type="button"
                    className={viewMode === "board" ? "active" : ""}
                    aria-pressed={viewMode === "board"}
                    onClick={() => {
                      setPreference("viewMode", "board");
                    }}
                  >
                    <Columns3 aria-hidden="true" />
                    Board
                  </button>
                </div>
                <div className="pipeline-display-note">
                  <span>{viewMode === "board" ? "Columns" : "Grouping"}</span>
                  <strong>Opportunity stage</strong>
                </div>
                <div className="pipeline-sort-field">
                  <span>Sort by</span>
                  <SelectField
                    id="opportunity-sort"
                    name=""
                    value={sortOrder}
                    onValueChange={(value) =>
                      setPreference("sort", value as SortOrder)
                    }
                    ariaLabel="Sort opportunities"
                    options={[
                      { value: "priority", label: "Priority" },
                      { value: "updated", label: "Recently updated" },
                      { value: "deadline", label: "Deadline" },
                      { value: "company", label: "Company" },
                    ]}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="pipeline-filter-empty">
          <Search aria-hidden="true" />
          <h2>No matching opportunities</h2>
          <p>
            {query
              ? "Try a different search."
              : filter === "attention"
                ? "Every active Opportunity is current and has a Next Action."
                : `There are no ${filter} opportunities.`}
          </p>
        </div>
      ) : viewMode === "list" ? (
        <PipelineList
          items={filteredItems}
          visibleStages={visibleStages}
          moveByKeyboard={moveByKeyboard}
          referenceTime={referenceTime}
          ticketKey={ticketKey}
          {...(previewHref ? { previewHref } : {})}
        />
      ) : (
        <div className="board-shell">
          <div
            ref={boardRef}
            id="pipeline-board"
            className="board"
            aria-label="Opportunity board"
            aria-busy={isPending}
          >
            {visibleStages.map((stage) => {
              const stageItems = filteredItems.filter(
                (item) => item.stage === stage,
              );
              const StageIcon = stageDetails[stage].icon;
              return (
                <section
                  className={`board-column ${overStage === stage ? "is-drop-target" : ""}`}
                  data-stage={stage}
                  data-empty={stageItems.length === 0 || undefined}
                  key={stage}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setOverStage(stage);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    )
                      setOverStage(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id =
                      event.dataTransfer.getData("text/plain") ||
                      draggedIdRef.current;
                    const item = items.find((candidate) => candidate.id === id);
                    draggedIdRef.current = null;
                    setOverStage(null);
                    if (item) move(item, stage);
                  }}
                >
                  <header className="column-head">
                    <StageIcon aria-hidden="true" />
                    <span>{stageDetails[stage].label}</span>
                    <CountBadge
                      className="column-count"
                      value={stageItems.length}
                    />
                  </header>
                  <div className="board-card-stack">
                    {stageItems.map((item) => {
                      const due = dueLabel(
                        item.next_action_due_at,
                        referenceTime,
                      );
                      const attention = opportunityAttentionReasons(
                        item,
                        referenceTime,
                      );
                      return (
                        <article
                          className="opportunity-card"
                          draggable
                          tabIndex={0}
                          aria-grabbed="false"
                          key={item.id}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", item.id);
                            event.dataTransfer.setDragImage(
                              event.currentTarget,
                              18,
                              18,
                            );
                            draggedIdRef.current = item.id;
                          }}
                          onDragEnd={() => {
                            draggedIdRef.current = null;
                            setOverStage(null);
                          }}
                          onKeyDown={(event) => {
                            if (
                              !event.altKey ||
                              (event.key !== "ArrowLeft" &&
                                event.key !== "ArrowRight")
                            )
                              return;
                            event.preventDefault();
                            moveByKeyboard(
                              item,
                              event.key === "ArrowLeft" ? -1 : 1,
                            );
                          }}
                        >
                          <Link
                            className="opportunity-card-link"
                            href={previewHref ?? `/opportunities/${item.id}`}
                            draggable={false}
                            aria-label={`${item.jobs?.title ?? "Opportunity"} at ${item.jobs?.company ?? "unknown company"}. Stage ${stageDetails[item.stage].label}. Drag to another stage, or use Alt and arrow keys to move it.`}
                          >
                            <div className="card-topline">
                              <span className="mono" translate="no">
                                {ticketNumber(item)}
                              </span>
                              <span
                                className={`priority-label priority-${item.priority}`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <div className="card-role">
                              {item.jobs?.title ?? "Untitled role"}
                            </div>
                            <div className="card-company">
                              {item.jobs?.company ?? "Unknown company"}
                              <span>
                                {item.jobs?.location || "Location not added"}
                              </span>
                            </div>
                            <div
                              className={`card-action ${item.next_action ? "" : "is-empty"}`}
                            >
                              <CheckCircle2 aria-hidden="true" />
                              <span>
                                {item.next_action || "Add a Next Action"}
                              </span>
                              {attention.includes("stale") ? (
                                <em>Stale</em>
                              ) : null}
                            </div>
                            {due ? (
                              <footer className="card-footer">
                                <time className={due.overdue ? "overdue" : ""}>
                                  <CalendarClock aria-hidden="true" />
                                  {due.text}
                                </time>
                              </footer>
                            ) : null}
                          </Link>
                        </article>
                      );
                    })}
                    {stageItems.length === 0 ? (
                      <div className="board-empty">
                        <span />
                        Drop an opportunity here
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
          <BoardMinimap
            boardRef={boardRef}
            items={filteredItems}
            visibleStages={visibleStages}
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <dialog
        className="confirmation-dialog pipeline-close-dialog"
        ref={closeDialog}
        onClose={() => setClosing(null)}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            const reason = new FormData(event.currentTarget).get(
              "closedReason",
            );
            if (!closing || typeof reason !== "string" || !reason) return;
            move(closing, "closed", reason);
          }}
        >
          <span className="section-label">Close opportunity</span>
          <h2>Why is this opportunity closing?</h2>
          <p>This reason stays in the opportunity history.</p>
          <div className="field">
            <label htmlFor="pipelineClosedReason">Reason</label>
            <SelectField
              id="pipelineClosedReason"
              name="closedReason"
              required
              placeholder="Choose a reason…"
              ariaLabel="Closed reason"
              options={closedOutcomeReasons.map((label) => ({
                value: label,
                label,
              }))}
            />
          </div>
          <div>
            <Button
              className="button secondary"
              variant="outline"
              type="button"
              onClick={() => closeDialog.current?.close()}
            >
              Cancel
            </Button>
            <Button className="button primary" value="confirm">
              Move to closed
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function BoardMinimap({
  boardRef,
  items,
  visibleStages,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
  items: PipelineOpportunity[];
  visibleStages: readonly Stage[];
}) {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const update = () =>
      setMetrics({
        scrollLeft: board.scrollLeft,
        scrollWidth: board.scrollWidth,
        clientWidth: board.clientWidth,
      });
    update();
    board.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(board);
    return () => {
      board.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [boardRef, items]);

  if (metrics.scrollWidth <= metrics.clientWidth + 1) return null;
  const maxScroll = Math.max(metrics.scrollWidth - metrics.clientWidth, 1);
  const viewportWidth = Math.max(
    18,
    (metrics.clientWidth / metrics.scrollWidth) * 100,
  );
  const viewportLeft = (metrics.scrollLeft / metrics.scrollWidth) * 100;

  const moveToPointer = (clientX: number) => {
    const board = boardRef.current;
    const minimap = minimapRef.current;
    if (!board || !minimap) return;
    const bounds = minimap.getBoundingClientRect();
    const position = Math.min(
      1,
      Math.max(0, (clientX - bounds.left) / bounds.width),
    );
    board.scrollTo({
      left: position * board.scrollWidth - board.clientWidth / 2,
      behavior: "auto",
    });
  };

  return (
    <div
      ref={minimapRef}
      className="board-minimap"
      role="scrollbar"
      aria-label="Board position"
      aria-controls="pipeline-board"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.round(maxScroll)}
      aria-valuenow={Math.round(metrics.scrollLeft)}
      tabIndex={0}
      onKeyDown={(event) => {
        const board = boardRef.current;
        if (!board || (event.key !== "ArrowLeft" && event.key !== "ArrowRight"))
          return;
        event.preventDefault();
        board.scrollBy({
          left: event.key === "ArrowLeft" ? -220 : 220,
          behavior: "smooth",
        });
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveToPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          moveToPointer(event.clientX);
      }}
    >
      <div className="board-minimap-preview" aria-hidden="true">
        {visibleStages.map((stage) => (
          <span className="board-minimap-column" key={stage}>
            {items
              .filter((item) => item.stage === stage)
              .slice(0, 5)
              .map((item) => (
                <i key={item.id} />
              ))}
          </span>
        ))}
      </div>
      <span
        className="board-minimap-viewport"
        aria-hidden="true"
        style={{ left: `${viewportLeft}%`, width: `${viewportWidth}%` }}
      />
    </div>
  );
}

function PipelineList({
  items,
  visibleStages,
  moveByKeyboard,
  referenceTime,
  ticketKey,
  previewHref,
}: {
  items: PipelineOpportunity[];
  visibleStages: readonly Stage[];
  moveByKeyboard: (item: PipelineOpportunity, direction: -1 | 1) => void;
  referenceTime: Date;
  ticketKey: string;
  previewHref?: string;
}) {
  return (
    <div className="pipeline-list-view" aria-label="Opportunity list">
      {visibleStages.map((stage) => {
        const stageItems = items.filter((item) => item.stage === stage);
        if (!stageItems.length) return null;
        const StageIcon = stageDetails[stage].icon;
        return (
          <section className="pipeline-list-group" key={stage}>
            <header>
              <StageIcon aria-hidden="true" />
              <h2>{stageDetails[stage].label}</h2>
              <CountBadge value={stageItems.length} />
            </header>
            <div>
              {stageItems.map((item) => {
                const due = dueLabel(item.next_action_due_at, referenceTime);
                const attention = opportunityAttentionReasons(
                  item,
                  referenceTime,
                );
                return (
                  <Link
                    className="pipeline-list-row"
                    href={previewHref ?? `/opportunities/${item.id}`}
                    key={item.id}
                    onKeyDown={(event) => {
                      if (
                        !event.altKey ||
                        (event.key !== "ArrowLeft" &&
                          event.key !== "ArrowRight")
                      )
                        return;
                      event.preventDefault();
                      moveByKeyboard(item, event.key === "ArrowLeft" ? -1 : 1);
                    }}
                  >
                    <span className="pipeline-list-id mono" translate="no">
                      {formatOpportunityTicket(
                        ticketKey,
                        item.reference_number,
                      )}
                    </span>
                    <span className="pipeline-list-identity">
                      <strong>{item.jobs?.title ?? "Untitled role"}</strong>
                      <small>
                        {item.jobs?.company ?? "Unknown company"}
                        {item.jobs?.location ? ` · ${item.jobs.location}` : ""}
                      </small>
                    </span>
                    <span
                      className={`priority-label priority-${item.priority}`}
                    >
                      {item.priority}
                    </span>
                    <span
                      className={`pipeline-list-action ${item.next_action ? "" : "is-empty"}`}
                    >
                      <small>Next Action</small>
                      <span>{item.next_action || "Choose a Next Action"}</span>
                    </span>
                    <span
                      className={`pipeline-list-due ${due?.overdue ? "overdue" : ""}`}
                    >
                      {due ? (
                        <>
                          <CalendarClock aria-hidden="true" />
                          {due.text}
                        </>
                      ) : attention.includes("stale") ? (
                        "Stale · review"
                      ) : (
                        "Unscheduled"
                      )}
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
