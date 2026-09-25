"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  Cpu,
  Plus,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAgentLive } from "./live-chat";
import { type AgentContextPage } from "./scope";
import { matchingCapabilities } from "./capabilities";

const subscribe = () => () => {};

type ComposerProps = {
  connections: Array<{ id: string; label: string; model: string }>;
  opportunities: Array<{ id: string; label: string; workspaceId: string }>;
  workspaces: Array<{ id: string; label: string }>;
  workspaceId: string;
  contextPage: AgentContextPage;
  draftKey?: string | undefined;
  focusedOpportunityId: string;
  fixedFocus: boolean;
};

function ComposerPanel({ title, description, onClose, children }: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="agent-capability-popover floating-panel" data-side="top">
      <div className="agent-capability-heading">
        <strong>{title}</strong>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Close ${title}`} onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </div>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function AgentMessageInput({
  connections,
  opportunities,
  focusedOpportunityId,
  fixedFocus,
  workspaces,
  workspaceId,
  contextPage,
  draftKey,
}: ComposerProps) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [scopeId, setScopeId] = useState(workspaceId);
  const [focusId, setFocusId] = useState(focusedOpportunityId);
  const connection = connections.find((item) => item.id === connectionId);
  const focusLabel =
    opportunities.find((item) => item.id === focusId)?.label ??
    workspaces.find(item => item.id === scopeId)?.label ?? "All workspaces";
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = sessionStorage.getItem(`roleway-agent-draft:${draftKey}`);
      if (raw) {
        const draft: unknown = JSON.parse(raw);
        if (draft && typeof draft === "object" && "message" in draft && typeof draft.message === "string") setMessage(draft.message.slice(0, 4000));
        sessionStorage.removeItem(`roleway-agent-draft:${draftKey}`);
      }
    } catch { /* Storage may be disabled; the conversation link still works. */ }
  }, [draftKey]);
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<"focus" | "model" | null>(null);
  const focusOpen = picker === "focus";
  const modelOpen = picker === "model";
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const focusList = useRef<HTMLDivElement>(null);
  const id = useId();
  const { pending: formPending } = useFormStatus();
  const live = useAgentLive();
  const pending = formPending || Boolean(live?.pending || live?.navigating);
  useEffect(() => {
    if (live?.submission) { setMessage(""); setOpen(false); setPicker(null); }
  }, [live?.submission]);
  const timeZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const slash = /^\/([^\n]*)$/.exec(message);
  const items = matchingCapabilities(slash?.[1] ?? "");
  const highlighted = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!open && !picker) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { setOpen(false); setPicker(null); }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, picker]);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    if (picker) focusList.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }, [picker]);

  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    setMessage(
      slash || !message.trim()
        ? item.prompt
        : `${message.trim()}\n\n${item.prompt}`,
    );
    setOpen(false);
    input.current?.focus();
  }
  function toggle() {
    setPicker(null);
    setOpen((value) => !value);
    setActive(0);
    input.current?.focus();
  }

  return (
    <div
      ref={root}
      className="agent-message-input"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setPicker(null);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && (open || picker)) {
          event.preventDefault();
          setOpen(false);
          setPicker(null);
          input.current?.focus();
        }
      }}
    >
      {open && !pending ? (
        <ComposerPanel title="Create & explore" description="Choose a starting point. Send it to begin." onClose={() => { setOpen(false); input.current?.focus(); }}>
          <div
            ref={list}
            id={id}
            role="listbox"
            aria-label="Agent actions"
            className="agent-capability-list"
          >
            {(["Create", "Explore"] as const).map((group) => (
              <div role="group" aria-label={group} key={group}>
                {items.some((item) => item.group === group) ? (
                  <h3>{group}</h3>
                ) : null}
                {items.map((item, index) =>
                  item.group === group ? (
                    <button
                      type="button"
                      role="option"
                      id={`${id}-${index}`}
                      aria-selected={highlighted === index}
                      key={item.label}
                      onClick={() => choose(index)}
                      onFocus={() => setActive(index)}
                    >
                      <span>{item.label}</span>
                      <small>{item.description}</small>
                    </button>
                  ) : null,
                )}
              </div>
            ))}
            {!items.length ? (
              <p role="status">
                No matching actions. Try “task” or “interview”.
              </p>
            ) : null}
          </div>
        </ComposerPanel>
      ) : null}
      {focusOpen && !pending ? (
        <ComposerPanel title="Conversation focus" description="Choose all Workspaces, one Workspace, or an Opportunity." onClose={() => { setPicker(null); input.current?.focus(); }}>
          <div ref={focusList} id={`${id}-focus`} className="agent-capability-list agent-focus-list" aria-label="Conversation focus options">
            {[{ id: "", label: "All workspaces" }, ...workspaces].map(item => (
              <button type="button" key={`workspace-${item.id}`} aria-pressed={!focusId && scopeId === item.id} onClick={() => { setScopeId(item.id); setFocusId(""); setPicker(null); input.current?.focus(); }}>
                <span>{item.label}</span>{!focusId && scopeId === item.id ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
            {opportunities.filter(item => !scopeId || item.workspaceId === scopeId).map(item => (
              <button type="button" key={item.id} aria-pressed={focusId === item.id} onClick={() => { setScopeId(item.workspaceId); setFocusId(item.id); setPicker(null); input.current?.focus(); }}>
                <span>{item.label}</span>{focusId === item.id ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </ComposerPanel>
      ) : null}
      {modelOpen && !pending ? (
        <ComposerPanel title="Model" description="Choose a saved provider connection for this message." onClose={() => { setPicker(null); input.current?.focus(); }}>
          <div ref={focusList} id={`${id}-model`} className="agent-capability-list agent-focus-list" aria-label="Model options">
            {connections.map((item) => (
              <button type="button" key={item.id} aria-pressed={connectionId === item.id} onClick={() => { setConnectionId(item.id); setPicker(null); input.current?.focus(); }}>
                <span><span>{item.label}</span><small>{item.model}</small></span>
                {connectionId === item.id ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </ComposerPanel>
      ) : null}
      <input type="hidden" name="connectionId" value={connectionId} />
      <input type="hidden" name="opportunityId" value={focusId} />
      <input type="hidden" name="workspaceId" value={scopeId} />
      <input type="hidden" name="contextPage" value={contextPage} />
      <input type="hidden" name="timeZone" value={timeZone} />
      <label className="sr-only" htmlFor="agent-message">
        Message Roleway Agent
      </label>
      <textarea
        ref={input}
        id="agent-message"
        name="message"
        maxLength={4000}
        required
        readOnly={pending}
        value={pending ? "" : message}
        placeholder="Ask anything about your search, or type / for actions…"
        aria-controls={open ? id : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && items.length ? `${id}-${highlighted}` : undefined
        }
        onChange={(event) => {
          setMessage(event.target.value);
          setPicker(null);
          setOpen(event.target.value.startsWith("/"));
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setActive(
              (highlighted +
                (event.key === "ArrowDown" ? 1 : -1) +
                items.length) %
                Math.max(1, items.length),
            );
          } else if (open && event.key === "Enter") {
            event.preventDefault();
            choose(highlighted);
          } else if (event.key === "Enter" && !event.shiftKey && !pending) {
            event.preventDefault();
            if (message.trim()) event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <footer className="agent-composer-toolbar">
        <div className="agent-toolbar-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label="Show Agent actions"
            data-tooltip="Create or explore (/)"
            aria-expanded={open}
            aria-controls={id}
            onClick={toggle}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending || fixedFocus}
            aria-label="Agent Opportunity focus"
            data-tooltip={fixedFocus ? `Conversation focus: ${focusLabel}` : `Focus: ${focusLabel}`}
            aria-expanded={focusOpen}
            aria-controls={`${id}-focus`}
            onClick={() => { setOpen(false); setPicker(focusOpen ? null : "focus"); }}
          >
            <Route aria-hidden="true" />
          </Button>
          <Popover onOpenChange={(value) => { if (value) { setOpen(false); setPicker(null); } }}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Context and permissions"
                  data-tooltip="Context and permissions"
                />
              }
            >
              <ShieldCheck aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="agent-context-popover"
            >
              <PopoverTitle>Context and permissions</PopoverTitle>
              <p>
                Agent reads your Career Profile and {scopeId ? "the selected Workspace" : "your Workspaces"} after you send a request.
              </p>
              <p>
                You approve every internal change. Agent cannot submit
                applications or contact employers.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <div className="agent-toolbar-end">
          <Button
            type="button"
            variant="ghost"
            className="agent-model-picker"
            aria-label="Agent provider"
            data-tooltip={`${connection?.label} · ${connection?.model}`}
            disabled={pending}
            aria-expanded={modelOpen}
            aria-controls={`${id}-model`}
            onClick={() => { setOpen(false); setPicker(modelOpen ? null : "model"); }}
          >
            <Cpu aria-hidden="true" />
            <span className="agent-model-label">{connection?.model}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button
            className="agent-submit"
            type="submit"
            size="icon"
            disabled={pending || !message.trim()}
            aria-label={live?.navigating ? live.navigationLabel : pending ? "Agent is working" : "Send to Agent"}
            data-tooltip={
              live?.navigating ? `${live.navigationLabel}…` : pending ? "Agent is working…" : "Send message (Enter)"
            }
          >
            {pending ? <Spinner /> : <ArrowUp aria-hidden="true" />}
          </Button>
        </div>
        <span className="sr-only" role="status">
          {pending && !live?.navigating ? "Agent is working…" : ""}
        </span>
      </footer>
    </div>
  );
}

/** Reveal the saved result inside the app's nested scroll area after hydration. */
export function SavedResultFocus({ proposalId }: { proposalId: string }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`proposal-${proposalId}`);
      const result = card?.querySelector<HTMLElement>(
        ".agent-approval-outcome",
      );
      if (result) {
        result.scrollIntoView({ block: "center", behavior: "instant" });
        (result.querySelector<HTMLElement>("a, button") ?? result).focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [proposalId]);
  return null;
}

export function AgentNotice({ children, variant = "neutral" }: { children: ReactNode; variant?: "neutral" | "success" | "error" }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <div className={`agent-inline-state ${variant}`} role={variant === "error" ? "alert" : "status"}>
    {children}
    <Button type="button" variant="ghost" size="icon-xs" className="agent-notice-dismiss" aria-label="Dismiss notification" data-tooltip="Dismiss" onClick={() => {
      setDismissed(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("decision");
      url.searchParams.delete("error");
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }}><X aria-hidden="true" /></Button>
  </div>;
}

/** A transient history menu; run timelines remain ordinary persistent disclosures. */
export function AgentHistoryMenu({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (root.current?.open && !root.current.contains(event.target as Node)) root.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !root.current?.open || event.defaultPrevented) return;
      event.preventDefault();
      root.current.open = false;
      root.current.querySelector("summary")?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return <details ref={root} className="agent-history-menu" onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }} onClick={event => {
    if ((event.target as Element).closest("a[href]")) {
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus({ preventScroll: true });
    }
  }}>{children}</details>;
}
