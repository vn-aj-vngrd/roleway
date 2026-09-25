"use client";

import { ArrowUp, Maximize2, Navigation, Plus, Route, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { agentContextHref, agentPageFromPath } from "@/features/agent/scope";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { useAgentSessions, AgentActivityIndicator } from "@/features/agent/session-provider";
import { Spinner } from "@/components/ui/spinner";
import { AgentMarkdown } from "@/features/agent/markdown";
import { RunTimeline } from "@/features/agent/run-timeline";

import { Button } from "@/components/ui/button";

type AgentBreadcrumb = { label: string; href?: string };
type AgentConnection = { id: string; label: string } | null;

export function OpenAgentButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <button className={className} type="button" onClick={() => window.dispatchEvent(new CustomEvent("roleway:open-agent"))}>{children}</button>;
}

export function AgentPopoverLauncher({ pathname, projectId, projectName, breadcrumbs, connection }: { pathname: string; projectId: string; projectName: string; breadcrumbs: AgentBreadcrumb[]; connection: AgentConnection }) {
  const store = useAgentSessions();
  const session = store.get(store.popoverKey);
  const draftKey = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { messages, error } = useChat({ chat: session.chat });
  const { pending, failed, startedAt, endedAt } = session;
  const conversationHref = session.resultHref || (session.conversationId ? `/agent?conversation=${session.conversationId}` : "");
  const transcriptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 180) el.scrollTop = el.scrollHeight;
  }, [messages]);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opportunityId = pathname.match(/^\/opportunities\/([0-9a-f-]{36})/)?.[1] ?? "";
  const contextPage = agentPageFromPath(pathname);
  const workspaceId = ["home", "inbox", "opportunities", "interview", "contacts", "documents"].includes(contextPage) ? projectId : "";
  const baseHref = conversationHref || agentContextHref(workspaceId, contextPage, opportunityId);
  const fullHref = message.trim() ? `${baseHref}${baseHref.includes("?") ? "&" : "?"}draft=${encodeURIComponent(draftKey)}` : baseHref;
  const contextLabel = breadcrumbs.map((item) => item.label).join(" › ") || "Current workspace";
  const suggestions = opportunityId
    ? ["What needs attention here?", "Propose the next action", "Create a useful follow-up task"]
    : ["What needs attention today?", "Summarize this workspace", "Which work has no clear next action?"];

  useEffect(() => setOpen(false), [pathname, projectId]);
  useEffect(() => {
    if (!open || pathname === "/agent" || (!session.conversationId && !pending)) return;
    store.view(session, conversationHref || baseHref);
    return () => store.leave(session);
  }, [store, session, open, pathname, conversationHref, baseHref, pending]);
  useEffect(() => {
    const openAgent = () => setOpen(true);
    window.addEventListener("roleway:open-agent", openAgent);
    return () => window.removeEventListener("roleway:open-agent", openAgent);
  }, []);
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")?.focus());
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !launcherRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => launcherRef.current?.focus());
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (pathname === "/agent") return null;
  return <div className="global-agent-entry">
    {open ? <div className="global-agent-popover floating-panel" id="global-agent-popover" ref={panelRef} role="dialog" aria-label="Roleway Agent">
      <header>
        <strong>Agent</strong>
        <div className="global-agent-header-actions">
          <Button variant="ghost" size="icon-sm" type="button" aria-label="New conversation" data-tooltip="New conversation" onClick={() => {
            store.newPopover();
            setMessage("");
            panelRef.current?.querySelector("textarea")?.focus();
          }}><Plus aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon-sm" nativeButton={false} role="link" render={<Link href={fullHref} onClick={event => {
            if (pending && !conversationHref) { event.preventDefault(); return; }
            if (message.trim()) {
              try { sessionStorage.setItem(`roleway-agent-draft:${draftKey}`, JSON.stringify({ message })); } catch { /* Browsing without storage still supports saved conversations. */ }
            }
          }} />} aria-disabled={pending && !conversationHref} aria-label="Open full Agent" data-tooltip={pending && !conversationHref ? "Saving conversation…" : "Open full Agent"}><Maximize2 aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon-sm" type="button" aria-label="Close Agent" data-tooltip="Close Agent" onClick={() => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }}><X aria-hidden="true" /></Button>
        </div>
      </header>
      <div className="global-agent-context"><Route aria-hidden="true" /><span>{session.contextLabel || `${workspaceId ? projectName : "All workspaces"} · ${contextLabel}`}</span></div>
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
        {pending && messages.at(-1)?.role === "user" ? <p role="status" className="global-agent-pending"><Spinner aria-hidden="true" />Working…</p> : null}
        {failed || error ? <p role="alert">The request could not finish. {conversationHref ? <Link href={conversationHref}>Open the conversation to recover.</Link> : "Try again."}</p> : null}
        {conversationHref && !pending && !failed && !error ? <Link className="global-agent-review" href={conversationHref}>Open full conversation</Link> : null}
      </div>
      <form onSubmit={event => {
        event.preventDefault();
        if (!connection || !message.trim() || pending) return;
        const text = message.trim();
        setMessage("");
        if (!session.conversationId) session.contextLabel = `${workspaceId ? projectName : "All workspaces"} · ${contextLabel}`;
        store.view(session, baseHref);
        store.submit(session, { message: text, connectionId: connection.id, opportunityId, workspaceId, contextPage, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
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
    <Button ref={launcherRef} className="global-agent-launch" variant="outline" type="button" aria-label={`${open ? "Close" : "Open"} Roleway Agent`} aria-haspopup="dialog" aria-expanded={open} aria-controls="global-agent-popover" onClick={() => setOpen((current) => !current)}><Navigation aria-hidden="true" /><span>Agent</span><AgentActivityIndicator /></Button>
  </div>;
}
