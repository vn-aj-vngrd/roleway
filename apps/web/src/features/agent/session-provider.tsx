"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { AgentSessionStore } from "./session-store";

const SessionContext = createContext<AgentSessionStore | null>(null);

export function AgentSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [store] = useState(
    () =>
      new AgentSessionStore({
        onStarted(session) {
          if (
            store.viewing !== session ||
            window.location.pathname !== "/agent"
          )
            return;
          window.history.replaceState(
            null,
            "",
            `/agent?conversation=${session.conversationId}`,
          );
        },
        onFinished(session) {
          // Finishing in the background must never hijack the user's current page.
          if (
            store.viewing !== session ||
            window.location.pathname !== "/agent"
          )
            return;
          if (session.resultHref) {
            if (
              window.location.pathname + window.location.search !==
              session.resultHref
            )
              router.replace(session.resultHref, { scroll: false });
          }
        },
      }),
  );
  useEffect(() => () => store.dispose(), [store]);
  return (
    <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
  );
}

export function useAgentSessions() {
  const store = useContext(SessionContext);
  if (!store) throw new Error("AgentSessionProvider is required");
  useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return store;
}

export function AgentActivityIndicator({
  conversationId,
}: {
  conversationId?: string;
}) {
  const store = useAgentSessions();
  const activity = conversationId ? store.find(conversationId) : store.activity;
  if (!activity) return null;
  if (activity.pending)
    return (
      <i className="agent-nav-activity" title="Agent is working">
        <Spinner aria-label="Agent is working" />
      </i>
    );
  if (!activity.unread) return null;
  const label = activity.failed
    ? "Agent request needs attention"
    : "Agent response ready";
  return (
    <i
      className={`agent-nav-activity ${activity.failed ? "needs-attention" : "is-unread"}`}
      role="status"
      aria-label={label}
      title={label}
    >
      <i aria-hidden="true" />
    </i>
  );
}
