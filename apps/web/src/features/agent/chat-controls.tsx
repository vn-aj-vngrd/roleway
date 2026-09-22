"use client";

import {
  ArrowUp,
  Check,
  Copy,
  Cpu,
  Plus,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { matchingCapabilities } from "./capabilities";
import { formatMessageTimestamp } from "./message-time";

type ComposerProps = {
  connections: Array<{ id: string; label: string; model: string }>;
  opportunities: Array<{ id: string; label: string }>;
  focusedOpportunityId: string;
  fixedFocus: boolean;
};

export function AgentMessageInput({
  connections,
  opportunities,
  focusedOpportunityId,
  fixedFocus,
}: ComposerProps) {
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [focusId, setFocusId] = useState(focusedOpportunityId);
  const connection = connections.find((item) => item.id === connectionId);
  const focusLabel =
    opportunities.find((item) => item.id === focusId)?.label ??
    "All workspaces";
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const { pending } = useFormStatus();
  const timeZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const slash = /^\/([^\n]*)$/.exec(message);
  const items = matchingCapabilities(slash?.[1] ?? "");
  const highlighted = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

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
    setOpen((value) => !value);
    setActive(0);
    input.current?.focus();
  }

  return (
    <div
      ref={root}
      className="agent-message-input"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          input.current?.focus();
        }
      }}
    >
      {open && !pending ? (
        <div
          className="agent-capability-popover floating-panel"
          data-side="top"
        >
          <div className="agent-capability-heading">
            <strong>Create & explore</strong>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close Agent actions"
              onClick={() => {
                setOpen(false);
                input.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <p>Choose a starting point. Send it to begin.</p>
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
        </div>
      ) : null}
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
        value={message}
        placeholder="Ask anything about your search, or type / for actions…"
        aria-controls={open ? id : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && items.length ? `${id}-${highlighted}` : undefined
        }
        onChange={(event) => {
          setMessage(event.target.value);
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
          <Select
            name="opportunityId"
            value={focusId}
            onValueChange={(value) => setFocusId(value ?? "")}
            disabled={pending || fixedFocus}
          >
            <SelectTrigger
              className="agent-focus-picker"
              aria-label="Agent Opportunity focus"
              data-tooltip={
                fixedFocus
                  ? `Conversation focus: ${focusLabel}`
                  : `Focus: ${focusLabel}`
              }
            >
              <Route aria-hidden="true" />
            </SelectTrigger>
            <SelectContent
              side="top"
              align="start"
              alignItemWithTrigger={false}
              className="agent-picker-menu"
            >
              <SelectItem value="">All workspaces</SelectItem>
              {opportunities.map((item) => (
                <SelectItem value={item.id} key={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
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
                Agent reads your Career Profile and context across your
                Workspaces after you send a request.
              </p>
              <p>
                You approve every internal change. Agent cannot submit
                applications or contact employers.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <div className="agent-toolbar-end">
          <Select
            name="connectionId"
            value={connectionId}
            onValueChange={(value) => {
              if (value) setConnectionId(value);
            }}
            disabled={pending}
            items={connections.map((item) => ({
              value: item.id,
              label: item.model,
            }))}
          >
            <SelectTrigger
              className="agent-model-picker"
              aria-label="Agent provider"
              data-tooltip={`${connection?.label} · ${connection?.model}`}
            >
              <Cpu aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="top"
              align="end"
              alignItemWithTrigger={false}
              className="agent-picker-menu"
            >
              {connections.map((item) => (
                <SelectItem value={item.id} key={item.id}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.model}</small>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="agent-submit"
            type="submit"
            size="icon"
            disabled={pending || !message.trim()}
            aria-label={pending ? "Agent is working" : "Send to Agent"}
            data-tooltip={
              pending ? "Agent is working…" : "Send message (Enter)"
            }
          >
            {pending ? <Spinner /> : <ArrowUp aria-hidden="true" />}
          </Button>
        </div>
        <span className="sr-only" role="status">
          {pending ? "Agent is working…" : ""}
        </span>
      </footer>
    </div>
  );
}

export function MessageActions({ content }: { content: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return (
    <div className="agent-message-actions">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={status === "copied" ? "Message copied" : "Copy message"}
        data-tooltip={status === "copied" ? "Copied" : "Copy message"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        {status === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </Button>
      <span
        className={status === "failed" ? undefined : "sr-only"}
        role="status"
      >
        {status === "failed"
          ? "Could not copy. Select the message text to copy it."
          : status === "copied"
            ? "Message copied"
            : ""}
      </span>
    </div>
  );
}

const subscribe = () => () => {};
export function MessageTimestamp({ value }: { value: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time className="agent-message-timestamp" dateTime={value}>
      {mounted ? formatMessageTimestamp(value) : ""}
    </time>
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
        result.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [proposalId]);
  return null;
}
