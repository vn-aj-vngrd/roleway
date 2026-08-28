"use client";

import { ArrowRight, Navigation, Route, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { sendAgentMessage } from "@/app/(app)/agent/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

type AgentBreadcrumb = { label: string; href?: string };
type AgentConnection = { id: string; label: string } | null;

export function OpenAgentButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <button className={className} type="button" onClick={() => window.dispatchEvent(new CustomEvent("roleway:open-agent"))}>{children}</button>;
}

export function AgentPopoverLauncher({ pathname, projectName, breadcrumbs, connection }: { pathname: string; projectName: string; breadcrumbs: AgentBreadcrumb[]; connection: AgentConnection }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
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
        <span><Navigation aria-hidden="true" /><strong>Agent</strong></span>
        <Button variant="ghost" size="icon-sm" type="button" aria-label="Close Agent" onClick={() => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }}><X aria-hidden="true" /></Button>
      </header>
      <div className="global-agent-context">
        <span><Route aria-hidden="true" />Current context</span>
        <strong>{contextLabel}</strong>
        <small>{projectName}{opportunityId ? " · Focused Opportunity" : " · Account context available"}</small>
      </div>
      <form action={sendAgentMessage}>
        <input type="hidden" name="conversationId" value="" />
        <input type="hidden" name="connectionId" value={connection?.id ?? ""} />
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <label className="sr-only" htmlFor="global-agent-message">Ask Roleway Agent</label>
        <textarea id="global-agent-message" name="message" required maxLength={4000} disabled={!connection} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={connection ? "Ask a question or request a change…" : "Connect an AI provider to use Agent…"} />
        <div className="global-agent-suggestions" aria-label="Suggested Agent requests">
          {suggestions.map((suggestion) => <Button variant="ghost" size="sm" type="button" disabled={!connection} onClick={() => setMessage(suggestion)} key={suggestion}>{suggestion}</Button>)}
        </div>
        <div className="global-agent-confirmation"><ShieldCheck aria-hidden="true" /><span><strong>You approve every change</strong><small>Agent may read permitted context after you send. It cannot take external actions.</small></span></div>
        <footer>
          <Link href={opportunityId ? `/agent?opportunity=${opportunityId}` : "/agent"}>Open full Agent</Link>
          {connection ? <SubmitButton disabled={!message.trim()} pendingLabel="Agent is working…">Send to Agent<ArrowRight aria-hidden="true" /></SubmitButton> : <Link className="global-agent-setup" href="/settings/ai">Set up provider<ArrowRight aria-hidden="true" /></Link>}
        </footer>
      </form>
    </div> : null}
    <Button ref={launcherRef} className="global-agent-launch" variant="outline" type="button" aria-label={`${open ? "Close" : "Open"} Roleway Agent`} aria-haspopup="dialog" aria-expanded={open} aria-controls="global-agent-popover" onClick={() => setOpen((current) => !current)}><Navigation aria-hidden="true" /><span>Agent</span></Button>
  </div>;
}
