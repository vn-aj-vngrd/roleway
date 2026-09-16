"use client";

import { Check, Copy, Plus, Slash, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { matchingCapabilities } from "./capabilities";
import { formatMessageTimestamp } from "./message-time";

export function AgentMessageInput() {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const { pending } = useFormStatus();
  const timeZone = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "UTC");
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
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    setMessage(slash || !message.trim() ? item.prompt : `${message.trim()}\n\n${item.prompt}`);
    setOpen(false);
    input.current?.focus();
  }
  function toggle() {
    setOpen(value => !value);
    setActive(0);
    input.current?.focus();
  }

  return <div ref={root} className="agent-message-input" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); input.current?.focus(); }
  }}>
    {open && !pending ? <div className="agent-capability-popover floating-panel" data-side="top">
      <div className="agent-capability-heading"><strong>Create & explore</strong><Button type="button" variant="ghost" size="icon-sm" aria-label="Close Agent actions" onClick={() => { setOpen(false); input.current?.focus(); }}><X aria-hidden="true" /></Button></div>
      <p>Choose a starting point. Send it to begin.</p>
      <div ref={list} id={id} role="listbox" aria-label="Agent actions" className="agent-capability-list">
        {(["Create", "Explore"] as const).map(group => <div role="group" aria-label={group} key={group}>
          {items.some(item => item.group === group) ? <h3>{group}</h3> : null}
          {items.map((item, index) => item.group === group ? <button type="button" role="option" id={`${id}-${index}`} aria-selected={highlighted === index} key={item.label} onClick={() => choose(index)} onFocus={() => setActive(index)}>
            <span>{item.label}</span><small>{item.description}</small>
          </button> : null)}
        </div>)}
        {!items.length ? <p role="status">No matching actions. Try “task” or “interview”.</p> : null}
      </div>
    </div> : null}
    <input type="hidden" name="timeZone" value={timeZone} />
    <label className="sr-only" htmlFor="agent-message">Message Roleway Agent</label>
    <textarea ref={input} id="agent-message" name="message" maxLength={4000} required readOnly={pending} value={message}
      placeholder="Ask anything about your search, or type / for actions…"
      aria-controls={open ? id : undefined} aria-autocomplete="list" aria-activedescendant={open && items.length ? `${id}-${highlighted}` : undefined}
      onChange={event => { setMessage(event.target.value); setOpen(event.target.value.startsWith("/")); setActive(0); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setActive((highlighted + (event.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length));
        } else if (open && event.key === "Enter") { event.preventDefault(); choose(highlighted); }
        else if (event.key === "Enter" && !event.shiftKey && !pending) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} />
    <div className="agent-input-tools">
      <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label="Show Agent actions" aria-expanded={open} aria-controls={id} onClick={toggle}><Plus aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label="Show slash commands" aria-expanded={open} aria-controls={id} onClick={toggle}><Slash aria-hidden="true" /></Button>
      <span>{pending ? "Agent is working…" : "Create or explore · You approve every change"}</span>
    </div>
  </div>;
}

export function MessageActions({ content }: { content: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return <div className="agent-message-actions">
    <Button type="button" variant="ghost" size="sm" aria-label="Copy message" onClick={async () => {
      try { await navigator.clipboard.writeText(content); setStatus("copied"); }
      catch { setStatus("failed"); }
    }}>{status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{status === "copied" ? "Copied" : "Copy"}</span></Button>
    <span role="status">{status === "failed" ? "Could not copy. Select the message text to copy it." : status === "copied" ? "Message copied" : ""}</span>
  </div>;
}

const subscribe = () => () => {};
export function MessageTimestamp({ value }: { value: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <time className="agent-message-timestamp" dateTime={value}>{mounted ? formatMessageTimestamp(value) : ""}</time>;
}
