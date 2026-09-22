"use client";

import { ArrowUp, Maximize2, Navigation, Route, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AgentMarkdown } from "@/features/agent/markdown";
import { RunTimeline } from "@/features/agent/run-timeline";
import type { AgentUIMessage } from "@/features/agent/stream-types";

const transport = new DefaultChatTransport<AgentUIMessage>({ api: "/api/agent/chat" });
import { Button } from "@/components/ui/button";

type AgentBreadcrumb = { label: string; href?: string };
type AgentConnection = { id: string; label: string } | null;

export function OpenAgentButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <button className={className} type="button" onClick={() => window.dispatchEvent(new CustomEvent("roleway:open-agent"))}>{children}</button>;
}

export function AgentPopoverLauncher({ pathname, projectName, breadcrumbs, connection }: { pathname: string; projectName: string; breadcrumbs: AgentBreadcrumb[]; connection: AgentConnection }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const conversationId = useRef("");
  const [conversationHref, setConversationHref] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState<string>();
  const [failed, setFailed] = useState(false);
  const receivedResult = useRef(false);
  const busy = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat<AgentUIMessage>({
    transport,
    onData(part) {
      if (part.type === "data-started") {
        conversationId.current = part.data.conversationId;
        setConversationHref(`/agent?conversation=${part.data.conversationId}`);
      }
      if (part.type === "data-result") {
        receivedResult.current = true;
        setConversationHref(part.data.href);
        setFailed(part.data.href.includes("error="));
      }
    },
    onFinish() {
      busy.current = false;
      setEndedAt(new Date().toISOString());
      if (!receivedResult.current) setFailed(true);
    },
    onError() { busy.current = false; setFailed(true); setEndedAt(new Date().toISOString()); },
  });
  const pending = status === "submitted" || status === "streaming";
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 180) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opportunityId = pathname.match(/^\/opportunities\/([0-9a-f-]{36})/)?.[1] ?? "";
  const contextLabel = breadcrumbs.map((item) => item.label).join(" › ") || "Current workspace";
  const suggestions = opportunityId
    ? ["What needs attention here?", "Propose the next action", "Create a useful follow-up task"]
    : ["What needs attention today?", "Summarize this workspace", "Which work has no clear next action?"];

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const openAgent = () => setOpen(true);
    window.addEventListener("roleway:open-agent", openAgent);
    return () => window.removeEventListener("roleway:open-agent", openAgent);
  }, []);
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")?.focus());
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !launcherRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => launcherRef.current?.focus());
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div className="global-agent-entry">
    {open ? <div className="global-agent-popover floating-panel" id="global-agent-popover" ref={panelRef} role="dialog" aria-label="Roleway Agent">
      <header>
        <strong>Agent</strong>
        <div className="global-agent-header-actions">
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={conversationHref || (opportunityId ? `/agent?opportunity=${opportunityId}` : "/agent")} />} aria-label="Open full Agent" data-tooltip="Open full Agent"><Maximize2 aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon-sm" type="button" aria-label="Close Agent" data-tooltip="Close Agent" onClick={() => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }}><X aria-hidden="true" /></Button>
        </div>
      </header>
      <div className="global-agent-context"><Route aria-hidden="true" /><span>{projectName} · {contextLabel}</span></div>
      <div className="global-agent-transcript" ref={transcriptRef} aria-label="Agent conversation">
        {!messages.length ? <div className="global-agent-welcome">
          <h2>What can I help with?</h2>
          <p>Ask about your search or prepare your next step.</p>
          <div className="global-agent-suggestions" aria-label="Suggested Agent requests">
            {suggestions.slice(0, 2).map(suggestion => <Button variant="ghost" size="sm" type="button" disabled={!connection} onClick={() => { setMessage(suggestion); panelRef.current?.querySelector("textarea")?.focus(); }} key={suggestion}>{suggestion}</Button>)}
          </div>
        </div> : messages.map(item => {
          const answer = item.parts.find(part => part.type === "data-answer");
          return <article className={`agent-message ${item.role === "user" ? "user" : "agent"}`} key={item.id}>
            {item.role === "user" ? <div className="agent-message-content"><p>{item.parts.flatMap(part => part.type === "text" ? [part.text] : []).join("")}</p></div> : <>
              {item.id === messages.at(-1)?.id ? <RunTimeline startedAt={startedAt} endedAt={endedAt} pending={pending} failed={failed || Boolean(error)} steps={item.parts.flatMap(part => part.type === "data-progress" ? [part.data] : [])} /> : null}
              {answer?.type === "data-answer" ? <div className="agent-message-content"><AgentMarkdown content={answer.data.text} idPrefix={`mini-${item.id}`} /></div> : null}
            </>}
          </article>;
        })}
        {pending && messages.at(-1)?.role === "user" ? <p role="status" className="muted">Working…</p> : null}
        {failed || error ? <p role="alert">The request could not finish. {conversationHref ? <Link href={conversationHref}>Open the conversation to recover.</Link> : "Try again."}</p> : null}
        {conversationHref && !pending && !failed && !error ? <Link className="global-agent-review" href={conversationHref}>Open full conversation</Link> : null}
      </div>
      <form onSubmit={event => {
        event.preventDefault();
        if (!connection || !message.trim() || pending || busy.current) return;
        busy.current = true;
        receivedResult.current = false;
        setFailed(false);
        setStartedAt(new Date().toISOString());
        setEndedAt(undefined);
        const text = message.trim();
        setMessage("");
        void sendMessage({ text }, { body: { message: text, conversationId: conversationId.current, connectionId: connection.id, opportunityId } }).catch(() => { busy.current = false; });
      }}>
        <label className="sr-only" htmlFor="global-agent-message">Ask Roleway Agent</label>
        <textarea id="global-agent-message" required maxLength={4000} disabled={!connection || pending} value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
        }} placeholder={connection ? "Ask anything about your search…" : "Connect a provider to start chatting…"} />
        <footer>
          <span className="global-agent-model">{connection?.label || "No provider connected"}</span>
          <span className="global-agent-compose-actions">
            <Button variant="ghost" size="icon-sm" type="button" aria-label="You approve every change" data-tooltip="You approve every change. Agent cannot take external actions."><ShieldCheck aria-hidden="true" /></Button>
            {connection ? <Button size="icon-sm" type="submit" disabled={!message.trim() || pending} aria-label={pending ? "Agent is working" : "Send message"} data-tooltip="Send message"><ArrowUp aria-hidden="true" /></Button> : <Button size="sm" nativeButton={false} render={<Link href="/settings/ai" />}>Connect provider</Button>}
          </span>
        </footer>
      </form>
    </div> : null}
    <Button ref={launcherRef} className="global-agent-launch" variant="outline" type="button" aria-label={`${open ? "Close" : "Open"} Roleway Agent`} aria-haspopup="dialog" aria-expanded={open} aria-controls="global-agent-popover" onClick={() => setOpen((current) => !current)}><Navigation aria-hidden="true" /><span>Agent</span></Button>
  </div>;
}
