"use client";

import { useChat } from "@ai-sdk/react";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAgentSessions } from "./session-provider";
import { AgentMarkdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { RunTimeline } from "./run-timeline";
import type { AgentUIMessage, RunProgress } from "./stream-types";

const LiveContext = createContext<{
  pending: boolean;
  navigating: boolean;
  navigationLabel: string;
  isEmptyConversation: boolean;
  navigate: (href: string, newConversation?: boolean) => void;
  submit: (data: FormData) => void;
  submission: number;
  messages: AgentUIMessage[];
  runId: string;
  startedAt: string;
  error: string | undefined;
  endedAt: string | undefined;
} | null>(null);

export function useAgentLive() { return useContext(LiveContext); }

export function AgentLiveProvider({ children, pendingRunId, persistedRunIds, conversationId, draftId, canResetDraft = false }: {
  children: ReactNode; pendingRunId: string | undefined; persistedRunIds: string[]; conversationId: string; draftId: string; canResetDraft?: boolean;
}) {
  const router = useRouter();
  const store = useAgentSessions();
  const session = store.get(conversationId || `draft:${draftId}`, conversationId);
  const { messages, error } = useChat({ chat: session.chat });
  const [navigating, startNavigation] = useTransition();
  const [navigationLabel, setNavigationLabel] = useState("Loading conversation");
  const recovering = Boolean(pendingRunId && (pendingRunId !== session.runId || !session.endedAt));
  const persisted = Boolean(session.runId && persistedRunIds.includes(session.runId));
  const refreshedRun = useRef("");
  useEffect(() => {
    // A cached route may predate background completion. Fetch saved output and approval cards once.
    if (navigating || session.pending || !session.resultHref || session.failed || persisted || !session.runId || refreshedRun.current === session.runId) return;
    refreshedRun.current = session.runId;
    router.refresh();
  }, [router, session, session.pending, session.resultHref, session.failed, session.runId, persisted, navigating]);
  useEffect(() => {
    if (navigating) return;
    store.view(session, window.location.pathname + window.location.search);
    return () => store.leave(session);
  }, [store, session, conversationId, draftId, navigating]);
  return <LiveContext.Provider value={{
    pending: session.pending || recovering, navigating, navigationLabel,
    isEmptyConversation: !canResetDraft && !conversationId && !session.submission && !messages.length && !session.pending,
    navigate: (href, newConversation = false) => {
      setNavigationLabel(newConversation ? "Starting new conversation" : "Loading conversation");
      store.leave(session);
      startNavigation(() => router.push(href, { scroll: false }));
    },
    submit: data => {
      if (navigating || recovering) return;
      store.submit(session, Object.fromEntries(data));
    },
    submission: session.submission,
    messages: persisted ? [] : messages.slice(session.messageOffset),
    runId: session.runId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    error: error || session.failed ? "The request could not finish. Reload this conversation to check whether an answer was saved, or try again." : undefined,
  }}>{children}</LiveContext.Provider>;
}

export function AgentConversationLink({ newConversation = false, href, ...props }: ComponentProps<typeof Link> & { newConversation?: boolean }) {
  const live = useAgentLive();
  const disabled = Boolean(newConversation && (live?.isEmptyConversation || live?.navigating));
  return <Link {...props} href={href} aria-label={newConversation ? "New conversation" : props["aria-label"]} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : props.tabIndex} onClick={event => {
    if (disabled) event.preventDefault();
    else props.onClick?.(event);
  }} onNavigate={event => {
    if (!live) return;
    event.preventDefault();
    if (disabled) return;
    live.navigate(newConversation ? `/agent?new=${crypto.randomUUID()}` : String(href), newConversation);
  }} />;
}

export function AgentPersistedMessage({ runId, children }: { runId: string | null; children: ReactNode }) {
  const live = useAgentLive();
  if (runId && live?.runId === runId && live.messages.length) return null;
  return children;
}

export function AgentStreamForm({ children, action, conversationId }: { children: ReactNode; action: (data: FormData) => void; conversationId: string }) {
  const live = useAgentLive();
  return <form className="agent-native-composer" action={action} onSubmit={event => {
    if (!live) return;
    event.preventDefault();
    live.submit(new FormData(event.currentTarget));
  }}>
    <input type="hidden" name="conversationId" value={conversationId} />
    {children}
  </form>;
}

export function AgentTranscript({ children, emptyState, hasConversation }: { children: ReactNode; emptyState: ReactNode; hasConversation: boolean }) {
  const live = useAgentLive();
  const root = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  useEffect(() => {
    if (root.current && stickToBottom.current) root.current.scrollTop = root.current.scrollHeight;
  }, [live?.messages, children]);
  if (live?.navigating) return <div className="agent-conversation-loading" role="status"><Spinner aria-hidden="true" /><span>{live.navigationLabel}…</span></div>;
  if (!hasConversation && !live?.messages.length) return emptyState;
  const assistant = live?.messages.filter(message => message.role === "assistant").at(-1);
  const answer = assistant?.parts.find(part => part.type === "data-answer");
  const steps: RunProgress[] = assistant?.parts.flatMap(part => part.type === "data-progress" ? [part.data] : []) ?? [];
  return <div className="agent-transcript" aria-label="Agent conversation" ref={root} onScroll={event => {
    const el = event.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }}>
    {children}
    {live?.messages.filter(message => message.role === "user").map(message => {
      const content = message.parts.flatMap(part => part.type === "text" ? [part.text] : []).join("");
      return <article className="agent-message user" aria-label="Your message" key={message.id}>
        <div className="agent-message-body"><div className="agent-message-content"><p>{content}</p></div></div>
        <MessageActions content={content} timestamp={live.startedAt} />
      </article>;
    })}
    {live?.messages.length ? <article className="agent-message agent" aria-label="Agent response" aria-busy={live.pending}>
      <RunTimeline startedAt={live.startedAt} endedAt={live.endedAt} pending={live.pending} showCurrentStep={!answer?.data.text} failed={Boolean(live.error)} steps={steps.length ? steps : [{ id: "start", label: "Starting the request", status: "active" }]} />
      {answer?.type === "data-answer" ? <div className="agent-message-body"><div className="agent-message-content agent-streaming-answer"><AgentMarkdown content={answer.data.text} idPrefix="stream" /></div></div> : null}
      {answer?.type === "data-answer" ? <MessageActions content={answer.data.text} timestamp={live.endedAt ?? live.startedAt} /> : null}
      {live.error ? <p role="alert">{live.error} <button type="button" className="text-link" onClick={() => window.location.reload()}>Reload conversation</button></p> : null}
    </article> : null}
  </div>;
}
