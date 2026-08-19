"use client";

import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeTour } from "@/app/(app)/tour-actions";

const steps = [
  { target: "today", title: "Start with Today", body: "Interviews, due tasks, and jobs waiting for review appear here. If it isn’t actionable, it stays out." },
  { target: "jobs", title: "Review before you track", body: "Jobs enter an Inbox first. Track only the opportunities worth spending time on." },
  { target: "opportunities", title: "Run a focused pipeline", body: "Every tracked Opportunity keeps its next action, tasks, notes, interviews, and history together." },
  { target: "commands", title: "Move quickly when you’re ready", body: "Use ⌘K or Ctrl+K to add work, navigate, and find the next useful action." },
] as const;

export function ProductTour({ open }: { open: boolean }) {
  const [visible, setVisible] = useState(open);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const current = steps[step] ?? steps[0];

  const finish = (goToJobs: boolean) => {
    startTransition(async () => {
      await completeTour();
      setVisible(false);
      if (goToJobs) router.push("/jobs?create=true");
      else router.refresh();
    });
  };

  useEffect(() => {
    if (!visible) return;
    const selector = `[data-tour="${current.target}"]`;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const target = targets.find((element) => element.getClientRects().length > 0) ?? targets[0];
    target?.classList.add("tour-target");
    primaryRef.current?.focus();
    return () => target?.classList.remove("tour-target");
  }, [current.target, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!visible) return null;
  const final = step === steps.length - 1;

  return (
    <div className="tour-layer" aria-hidden="false">
      <div className="tour-scrim" />
      <section className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body">
        <header><span className="mono">{step + 1} / {steps.length}</span><button className="icon-button" onClick={() => finish(false)} aria-label="Skip product tour"><X /></button></header>
        <h2 id="tour-title">{current.title}</h2>
        <p id="tour-body">{current.body}</p>
        <footer><button className="button ghost" onClick={() => finish(false)} disabled={pending}>Skip tour</button><button ref={primaryRef} className="button primary" onClick={() => final ? finish(true) : setStep((value) => value + 1)} disabled={pending}>{final ? "Add my first job" : "Next"}<ArrowRight /></button></footer>
      </section>
    </div>
  );
}
