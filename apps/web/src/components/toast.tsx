"use client";

import { Archive, Check, Info, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";

type ToastTone = "success" | "info" | "removed";
type ToastInput = { title: string; description?: string; tone?: ToastTone; id?: string; duration?: number };

const toastEvent = "roleway:toast";

export function showToast(input: ToastInput) {
  if (typeof window === "undefined") return;
  const tone = input.tone ?? inferredTone(input.title);
  toast(input.title, {
    ...(input.id ? { id: input.id } : {}),
    ...(input.description ? { description: input.description } : {}),
    duration: input.duration ?? 5200,
    icon: <ToastIcon tone={tone} title={input.title} />,
    className: `app-toast toast-${tone}`,
  });
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
    updated: { title: pathname === "/settings/ai" ? "Connection updated" : "Changes saved" },
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
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const receive = (event: Event) => showToast((event as CustomEvent<ToastInput>).detail);
    window.addEventListener(toastEvent, receive);
    return () => window.removeEventListener(toastEvent, receive);
  }, []);

  useEffect(() => {
    for (const [key, message] of Object.entries(queryMessages(pathname))) {
      const id = `${pathname}:${key}`;
      if (searchParams.has(key) && !seen.current.has(id)) {
        seen.current.add(id);
        showToast({ ...message, id });
      } else if (!searchParams.has(key)) seen.current.delete(id);
    }
  }, [pathname, searchParams]);

  return <Toaster position="bottom-right" closeButton visibleToasts={3} gap={8}
    offset={{ bottom: pathname.startsWith("/settings") ? 20 : 76, right: 20 }}
    mobileOffset={{ bottom: "calc(76px + env(safe-area-inset-bottom))", left: 12, right: 12 }}
    toastOptions={{ closeButtonAriaLabel: "Dismiss notification" }} />;
}

export function CrudToast({ title, description, tone = "success" }: ToastInput) {
  useEffect(() => showToast({ title, tone, ...(description ? { description } : {}) }), [description, title, tone]);
  return null;
}
