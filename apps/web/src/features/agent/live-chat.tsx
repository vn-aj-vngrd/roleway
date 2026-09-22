"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AgentMarkdown } from "./markdown";
import { RunTimeline } from "./run-timeline";
import type { AgentUIMessage, RunProgress } from "./stream-types";

const transport = new DefaultChatTransport<AgentUIMessage>({ api: "/api/agent/chat" });
const LiveContext = createContext<{
  pending: boolean;
  submit: (data: FormData) => void;
  messages: AgentUIMessage[];
  startedAt: string;
  error: string | undefined;
  endedAt: string | undefined;
} | null>(null);

export function useAgentLive() { return useContext(LiveContext); }

export function AgentLiveProvider({ children, initialPending = false }: { children: ReactNode; initialPending?: boolean }) {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState<string>();
  const href = useRef<string | null>(null);
  const savedConversationId = useRef<string | null>(null);
  const [incomplete, setIncomplete] = useState(false);
  const busy = useRef(false);
  const { messages, sendMessage, setMessages, status, error } = useChat<AgentUIMessage>({
    transport,
    onData(part) {
      if (part.type === "data-result") href.current = part.data.href;
      if (part.type === "data-started") {
        savedConversationId.current = part.data.conversationId;
        // Makes a saved in-flight conversation recoverable if the browser disconnects.
        window.history.replaceState(null, "", `/agent?conversation=${part.data.conversationId}`);
      }
    },
    onFinish() {
      setEndedAt(new Date().toISOString());
      if (href.current) {
        router.replace(href.current, { scroll: false });
        router.refresh();
      } else setIncomplete(true);
      busy.current = false;
    },
    onError() { busy.current = false; setEndedAt(new Date().toISOString()); },
  });
  const pending = initialPending || status === "submitted" || status === "streaming";
  function submit(data: FormData) {
    if (busy.current || initialPending) return;
    const text = String(data.get("message") ?? "").trim();
    if (!text) return;
    busy.current = true;
    href.current = null;
    setStartedAt(new Date().toISOString());
    setEndedAt(undefined);
    setIncomplete(false);
    setMessages([]);
    void sendMessage({ text }, { body: { ...Object.fromEntries(data), ...(savedConversationId.current ? { conversationId: savedConversationId.current } : {}) } }).catch(() => { busy.current = false; });
  }
  return <LiveContext.Provider value={{ pending, submit, messages, startedAt, endedAt, error: error || incomplete ? "The connection was interrupted. Reload this conversation to check whether the answer was saved." : undefined }}>{children}</LiveContext.Provider>;
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
  }, [live?.messages]);
  if (!hasConversation && !live?.messages.length) return emptyState;
  const assistant = live?.messages.filter(message => message.role === "assistant").at(-1);
  const answer = assistant?.parts.find(part => part.type === "data-answer");
  const steps: RunProgress[] = assistant?.parts.flatMap(part => part.type === "data-progress" ? [part.data] : []) ?? [];
  return <div className="agent-transcript" aria-label="Agent conversation" ref={root} onScroll={event => {
    const el = event.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }}>
    {children}
    {live?.messages.filter(message => message.role === "user").map(message => <article className="agent-message user" aria-label="Your message" key={message.id}><div className="agent-message-body"><div className="agent-message-content"><p>{message.parts.flatMap(part => part.type === "text" ? [part.text] : []).join("")}</p></div></div></article>)}
    {live?.messages.length ? <article className="agent-message agent" aria-label="Agent response" aria-busy={live.pending}>
      <RunTimeline startedAt={live.startedAt} endedAt={live.endedAt} pending={live.pending} failed={Boolean(live.error)} steps={steps.length ? steps : [{ id: "start", label: "Starting the request", status: "active" }]} />
      {answer?.type === "data-answer" ? <div className="agent-message-content agent-streaming-answer"><AgentMarkdown content={answer.data.text} idPrefix="stream" /></div> : null}
      {live.error ? <p role="alert">{live.error} <button type="button" className="text-link" onClick={() => window.location.reload()}>Reload conversation</button></p> : null}
    </article> : null}
  </div>;
}
