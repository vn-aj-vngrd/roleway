import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatTransport } from "ai";
import type { AgentUIMessage } from "./stream-types";

export type AgentSession = {
  chat: Chat<AgentUIMessage>;
  conversationId: string;
  contextLabel: string;
  runId: string;
  pending: boolean;
  unread: boolean;
  failed: boolean;
  submission: number;
  messageOffset: number;
  startedAt: string;
  endedAt: string | undefined;
  resultHref: string;
};

const transport = new DefaultChatTransport<AgentUIMessage>({
  api: "/api/agent/chat",
  prepareSendMessagesRequest: ({ body }) => ({ body: body ?? {} }),
});

/** Account-layout lifetime: route subscribers may unmount without aborting a run. */
export class AgentSessionStore {
  private sessions = new Map<string, AgentSession>();
  private listeners = new Set<() => void>();
  private revision = 0;
  viewing: AgentSession | null = null;
  lastHref = "/agent";
  popoverKey = "popover";
  private lastSession: AgentSession | null = null;

  constructor(
    private options: {
      transport?: ChatTransport<AgentUIMessage>;
      onStarted?: (session: AgentSession) => void;
      onFinished?: (session: AgentSession) => void;
    } = {},
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.revision;
  getServerSnapshot = () => 0;
  private emit() {
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }

  newPopover() {
    const previous = this.sessions.get(this.popoverKey);
    if (previous) this.leave(previous);
    this.popoverKey = `popover:${crypto.randomUUID()}`;
    this.emit();
  }

  find(key: string) {
    return this.sessions.get(key);
  }

  get(key: string, conversationId = ""): AgentSession {
    const existing = this.sessions.get(key);
    if (existing) return existing;
    const session: AgentSession = {
      conversationId,
      contextLabel: "",
      runId: "",
      pending: false,
      unread: false,
      failed: false,
      submission: 0,
      messageOffset: 0,
      startedAt: "",
      endedAt: undefined,
      resultHref: "",
      chat: new Chat<AgentUIMessage>({
        transport: this.options.transport ?? transport,
        onData: (part) => {
          if (part.type === "data-started") {
            session.conversationId = part.data.conversationId;
            session.runId = part.data.runId;
            this.sessions.set(session.conversationId, session);
            if (this.lastSession === session)
              this.lastHref = `/agent?conversation=${session.conversationId}`;
            this.options.onStarted?.(session);
            this.emit();
          }
          if (part.type === "data-result") {
            session.resultHref = part.data.href;
            session.failed = new URL(
              part.data.href,
              "http://roleway.local",
            ).searchParams.has("error");
          }
        },
        onFinish: ({ isAbort, isError }) =>
          this.finish(session, isAbort || isError || !session.resultHref),
        onError: () => this.finish(session, true),
      }),
    };
    this.sessions.set(key, session);
    return session;
  }

  view(session: AgentSession, href: string) {
    const changed =
      this.viewing !== session || this.lastHref !== href || session.unread;
    this.viewing = session;
    this.lastSession = session;
    this.lastHref = href;
    session.unread = false;
    if (changed) this.emit();
  }

  leave(session: AgentSession) {
    if (this.viewing === session) this.viewing = null;
  }

  get activity() {
    const sessions = [...new Set(this.sessions.values())];
    return {
      pending: sessions.some((session) => session.pending),
      unread: sessions.some((session) => session.unread),
      failed: sessions.some((session) => session.unread && session.failed),
    };
  }

  submit(session: AgentSession, body: Record<string, unknown>) {
    const text = String(body.message ?? "").trim();
    if (session.pending || !text) return;
    session.pending = true;
    session.unread = false;
    session.failed = false;
    session.runId = "";
    session.resultHref = "";
    session.startedAt = new Date().toISOString();
    session.endedAt = undefined;
    session.submission += 1;
    session.messageOffset = session.chat.messages.length;
    session.chat.clearError();
    this.emit();
    void session.chat
      .sendMessage(
        { text },
        {
          body: {
            ...body,
            message: text,
            conversationId: session.conversationId,
          },
        },
      )
      .catch(() => this.finish(session, true));
  }

  private finish(session: AgentSession, failed: boolean) {
    if (!session.pending) return;
    session.pending = false;
    session.failed ||= failed;
    session.endedAt = new Date().toISOString();
    session.unread = this.viewing !== session;
    this.emit();
    this.options.onFinished?.(session);
  }

  dispose() {
    for (const session of new Set(this.sessions.values()))
      void session.chat.stop();
  }
}
