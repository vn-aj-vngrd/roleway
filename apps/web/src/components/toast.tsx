"use client";

import { Archive, Check, Info, Trash2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ToastTone = "success" | "info" | "removed";
type ToastInput = { title: string; description?: string; tone?: ToastTone; id?: string; duration?: number };
type ToastItem = Required<Pick<ToastInput, "title" | "tone" | "duration">> & { id: string; description: string | undefined };

const toastEvent = "roleway:toast";

export function showToast(input: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastInput>(toastEvent, { detail: input }));
}

function inferredTone(message: string): ToastTone {
  return /deleted|removed|archived/i.test(message) ? "removed" : "success";
}

function queryMessages(pathname: string): Record<string, ToastInput> {
  return {
    workspaceCreated: { title: "Workspace created", description: "Your new search workspace is ready." },
    projectCreated: { title: "Workspace created", description: "Your new search workspace is ready." },
    welcome: { title: "Workspace created", description: "Add a Job when you are ready." },
    workspaceSaved: { title: "Workspace details updated" },
    projectArchived: { title: "Workspace archived", tone: "removed" },
    restored: { title: "Workspace restored" },
    archived: { title: "Workspace archived", tone: "removed" },
    tracked: { title: "Opportunity created", description: "The saved Job is now in your pipeline." },
    applied: { title: "Application recorded", description: "A seven-day follow-up is now on Home." },
    assessmentSaved: { title: "Decision details saved" },
    contactCreated: { title: "Contact added" },
    contactSaved: { title: "Contact updated" },
    documentCreated: { title: "Document created" },
    nextActionSaved: { title: "Next Action saved" },
    created: pathname === "/inbox" ? { title: "Job added to Inbox" } : pathname === "/contacts" ? { title: "Contact added" } : { title: "Interview scheduled" },
    saved: pathname.startsWith("/documents/") ? { title: "Document saved" } : pathname.startsWith("/interview/") ? { title: "Interview saved" } : pathname === "/settings/profile" ? { title: "Profile saved" } : pathname.includes("/workspaces/") ? { title: "Workspace saved" } : { title: "Changes saved" },
    deleted: pathname === "/documents" ? { title: "Document deleted", tone: "removed" } : pathname === "/contacts" ? { title: "Contact removed", tone: "removed" } : pathname === "/interview" ? { title: "Interview deleted", tone: "removed" } : { title: "Connection removed", tone: "removed" },
    tested: { title: "Connection verified" },
    guidanceSaved: { title: "Agent guidance saved" },
  };
}

function ToastIcon({ tone, title }: { tone: ToastTone; title: string }) {
  if (tone === "removed") return /archived/i.test(title) ? <Archive aria-hidden="true" /> : <Trash2 aria-hidden="true" />;
  if (tone === "info") return <Info aria-hidden="true" />;
  return <Check aria-hidden="true" />;
}

export function ToastViewport() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seen = useRef(new Set<string>());

  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const push = useCallback((input: ToastInput) => {
    const key = input.id;
    if (key && seen.current.has(key)) return;
    if (key) seen.current.add(key);
    const item: ToastItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: input.title, description: input.description, tone: input.tone ?? inferredTone(input.title), duration: input.duration ?? 5200 };
    setItems((current) => [...current.slice(-3), item]);
    window.setTimeout(() => dismiss(item.id), item.duration);
  }, [dismiss]);

  useEffect(() => {
    const receive = (event: Event) => push((event as CustomEvent<ToastInput>).detail);
    window.addEventListener(toastEvent, receive);
    return () => window.removeEventListener(toastEvent, receive);
  }, [push]);

  useEffect(() => {
    for (const [key, message] of Object.entries(queryMessages(pathname))) {
      const id = `${pathname}:${key}`;
      if (searchParams.has(key)) push({ ...message, id });
      else seen.current.delete(id);
    }
  }, [pathname, push, searchParams]);

  return <section className="toast-viewport" aria-label="Notifications" aria-live="polite" aria-relevant="additions">
    {items.map((item) => <article className="app-toast" data-tone={item.tone} key={item.id}>
      <span className="app-toast-icon"><ToastIcon tone={item.tone} title={item.title} /></span>
      <span className="app-toast-copy"><strong>{item.title}</strong>{item.description ? <small>{item.description}</small> : null}</span>
      <button type="button" aria-label={`Dismiss ${item.title}`} onClick={() => dismiss(item.id)}><X aria-hidden="true" /></button>
      <span className="app-toast-progress" style={{ animationDuration: `${item.duration}ms` }} aria-hidden="true" />
    </article>)}
  </section>;
}

export function CrudToast({ title, description, tone = "success" }: ToastInput) {
  useEffect(() => showToast({ title, tone, ...(description ? { description } : {}) }), [description, title, tone]);
  return null;
}
