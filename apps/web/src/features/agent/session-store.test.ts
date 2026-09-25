import { describe, expect, it, vi } from "vitest";
import type { ChatTransport, UIMessageChunk } from "ai";
import { AgentSessionStore } from "./session-store";
import type { AgentUIMessage } from "./stream-types";

function fixture() {
  const streams: ReadableStreamDefaultController<UIMessageChunk>[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  const transport: ChatTransport<AgentUIMessage> = {
    sendMessages: async ({ abortSignal }) => {
      signals.push(abortSignal);
      return new ReadableStream({
        start(controller) {
          streams.push(controller);
        },
      });
    },
    reconnectToStream: async () => null,
  };
  const finished = vi.fn();
  const store = new AgentSessionStore({ transport, onFinished: finished });
  const start = async (key: string, conversationId: string) => {
    const session = store.get(key, key.startsWith("draft:") ? "" : key);
    store.view(
      session,
      key.startsWith("draft:") ? "/agent" : `/agent?conversation=${key}`,
    );
    store.submit(session, { message: "Summarize my search" });
    await vi.waitFor(() => expect(streams.length).toBe(signals.length));
    const stream = streams.at(-1)!;
    stream.enqueue({ type: "start", messageId: `message-${conversationId}` });
    stream.enqueue({
      type: "data-started",
      data: { conversationId, runId: `run-${conversationId}` },
      transient: true,
    });
    await vi.waitFor(() => expect(session.runId).toBe(`run-${conversationId}`));
    return { session, stream };
  };
  const finish = async (
    stream: ReadableStreamDefaultController<UIMessageChunk>,
    conversationId: string,
  ) => {
    stream.enqueue({
      type: "data-answer",
      id: "answer",
      data: { text: "Saved answer" },
    });
    stream.enqueue({
      type: "data-result",
      data: { href: `/agent?conversation=${conversationId}` },
      transient: true,
    });
    stream.enqueue({ type: "finish" });
    stream.close();
    await vi.waitFor(() =>
      expect(store.get(conversationId).pending).toBe(false),
    );
  };
  return { store, start, finish, finished, streams, signals };
}

describe("Agent session continuity", () => {
  it("keeps a stream alive after leaving and clears its unread state only when viewed", async () => {
    const { store, start, finish, signals } = fixture();
    const { session, stream } = await start("draft:new", "one");
    store.leave(session);
    expect(store.get("one")).toBe(session);
    expect(signals[0]?.aborted).toBe(false);
    expect(store.activity.pending).toBe(true);
    await finish(stream, "one");
    expect(store.lastHref).toBe("/agent?conversation=one");
    expect(store.activity).toEqual({
      pending: false,
      unread: true,
      failed: false,
    });
    expect(session.chat.messages.at(-1)?.parts).toContainEqual({
      type: "data-answer",
      id: "answer",
      data: { text: "Saved answer" },
    });
    store.view(session, store.lastHref);
    expect(store.activity.unread).toBe(false);
  });

  it("keeps concurrent conversations isolated and does not mark another conversation read", async () => {
    const { store, start, finish } = fixture();
    const first = await start("one", "one");
    const second = await start("two", "two");
    await finish(first.stream, "one");
    expect(store.lastHref).toBe("/agent?conversation=two");
    expect(store.activity).toEqual({
      pending: true,
      unread: true,
      failed: false,
    });
    store.view(second.session, store.lastHref);
    expect(first.session.unread).toBe(true);
    await finish(second.stream, "two");
    expect(second.session.unread).toBe(false);
    expect(first.session.chat).not.toBe(second.session.chat);
  });

  it("remembers an ID received after navigating away from a new conversation", async () => {
    const { store, streams } = fixture();
    const session = store.get("draft:new");
    store.view(session, "/agent");
    store.submit(session, { message: "Hello" });
    store.leave(session);
    await vi.waitFor(() => expect(streams).toHaveLength(1));
    streams[0]!.enqueue({ type: "start", messageId: "new-message" });
    streams[0]!.enqueue({
      type: "data-started",
      data: { conversationId: "saved", runId: "run" },
      transient: true,
    });
    await vi.waitFor(() =>
      expect(store.lastHref).toBe("/agent?conversation=saved"),
    );
    store.dispose();
  });

  it("reports interrupted runs as needing attention and permits retry", async () => {
    const { store, start, streams, finished } = fixture();
    const { session, stream } = await start("one", "one");
    store.leave(session);
    stream.error(new Error("Disconnected"));
    await vi.waitFor(() => expect(session.pending).toBe(false));
    expect(store.activity).toEqual({
      pending: false,
      unread: true,
      failed: true,
    });
    expect(finished).toHaveBeenCalledTimes(1);
    store.submit(session, { message: "Try again" });
    await vi.waitFor(() => expect(streams).toHaveLength(2));
    expect(session.failed).toBe(false);
    expect(session.unread).toBe(false);
    store.dispose();
  });

  it("retains earlier floating-chat messages while isolating the current live turn", async () => {
    const { store, start, finish, streams } = fixture();
    const { session, stream } = await start("one", "one");
    await finish(stream, "one");
    const earlier = [...session.chat.messages];
    store.submit(session, { message: "Follow up" });
    await vi.waitFor(() => expect(streams).toHaveLength(2));
    expect(session.messageOffset).toBe(earlier.length);
    expect(session.chat.messages.slice(0, session.messageOffset)).toEqual(
      earlier,
    );
    expect(session.chat.messages.slice(session.messageOffset)).toHaveLength(1);
    store.dispose();
  });

  it("ignores double submits and stops runs when the account layout is disposed", async () => {
    const { store, start, signals, streams } = fixture();
    const { session } = await start("one", "one");
    store.submit(session, { message: "Duplicate" });
    expect(streams).toHaveLength(1);
    store.dispose();
    expect(signals[0]?.aborted).toBe(true);
  });
});


describe("Agent conversation focus", () => {
  const all = { workspaceId: "", opportunityId: "", workspaceLabel: "All workspaces", label: "All workspaces" };
  const selected = { workspaceId: "workspace-one", opportunityId: "", workspaceLabel: "Engineering", label: "Engineering" };

  it("shares draft focus across subscribers and preserves it when returning to the draft", () => {
    const store = new AgentSessionStore();
    const changed = vi.fn();
    store.subscribe(changed);
    const session = store.get("draft:one", "", all);
    store.view(session, "/agent");
    changed.mockClear();
    store.setFocus(session, selected);
    expect(store.viewing?.focus).toEqual(selected);
    expect(store.get("draft:one", "", all).focus).toEqual(selected);
    expect(changed).toHaveBeenCalledTimes(1);
    store.setFocus(session, selected);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(store.get("draft:new", "", all).focus).toEqual(all);
  });

  it("locks focus during submission and after the conversation starts, even before route refresh", async () => {
    const { store, start, finish } = fixture();
    const session = store.get("draft:one", "", selected);
    const started = start("draft:one", "saved-one");
    store.setFocus(session, all);
    expect(session.focus).toEqual(selected);
    const { stream } = await started;
    await finish(stream, "saved-one");
    store.setFocus(session, all);
    expect(session.focus).toEqual(selected);
    expect(store.get("saved-one").focus).toEqual(selected);
  });

  it("refreshes saved labels for every subscriber without overwriting draft selections", () => {
    const store = new AgentSessionStore();
    const saved = store.get("saved-one", "saved-one", selected);
    store.view(saved, "/agent?conversation=saved-one");
    const changed = vi.fn();
    store.subscribe(changed);
    const renamed = { ...selected, workspaceLabel: "Renamed workspace", label: "Renamed workspace · Renamed role" };
    store.syncSavedFocus(saved, renamed);
    expect(saved.focus).toEqual(renamed);
    expect(store.viewing?.focus).toEqual(renamed);
    expect(changed).toHaveBeenCalledTimes(1);
    store.syncSavedFocus(saved, { ...renamed });
    expect(changed).toHaveBeenCalledTimes(1);
    const draft = store.get("draft:new", "", all);
    store.setFocus(draft, selected);
    store.syncSavedFocus(draft, all);
    expect(draft.focus).toEqual(selected);
  });

  it("initializes saved scope when expanding a floating conversation", () => {
    const store = new AgentSessionStore();
    const session = store.get("saved-one", "saved-one");
    expect(store.get("saved-one", "saved-one", selected)).toBe(session);
    store.setFocus(session, all);
    expect(session.focus).toEqual(selected);
  });
});
