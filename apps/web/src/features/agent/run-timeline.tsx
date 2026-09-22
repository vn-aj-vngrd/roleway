"use client";

import { Check, ChevronRight, Circle, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RunProgress } from "./stream-types";

export function formatRunDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function RunTimeline({ startedAt, endedAt, pending = false, failed = false, steps, model, awaitingApproval = false, recovering = false, statusUnknown = false }: {
  recovering?: boolean;
  statusUnknown?: boolean;
  startedAt: string;
  endedAt?: string | undefined;
  pending?: boolean;
  failed?: boolean;
  awaitingApproval?: boolean;
  steps: RunProgress[];
  model?: string;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!recovering || !pending) return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [recovering, pending, router]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - Date.parse(startedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [pending, startedAt]);
  const duration = pending ? elapsed : endedAt ? Date.parse(endedAt) - Date.parse(startedAt) : undefined;
  const current = [...steps].reverse().find(step => step.status === "active");
  return <><details className="agent-work-timeline">
    <summary>
      {pending ? <LoaderCircle className="agent-working-spinner" aria-hidden="true" /> : null}
      <span>{statusUnknown ? "Run status unavailable" : pending ? "Working" : "Worked"}{!statusUnknown && duration !== undefined ? ` for ${formatRunDuration(duration)}` : ""}</span>
      {failed ? <span className="agent-work-failed">· Failed</span> : null}
      <ChevronRight aria-hidden="true" />
    </summary>
    <div className="agent-work-steps">
      {steps.map(step => <p key={step.id}>
        {step.status === "completed" ? <Check aria-hidden="true" /> : step.status === "failed" ? <X aria-hidden="true" /> : <Circle aria-hidden="true" />}
        <span>{step.label}</span>
      </p>)}
      {statusUnknown ? <p>No completion was recorded. You can send a new request.</p> : null}
      {awaitingApproval ? <p>Proposed changes are waiting for your approval.</p> : null}
      {model ? <p className="agent-run-model">{model}</p> : null}
    </div>
  </details>{pending && current ? <p className="agent-working-current" role="status">{current.label}</p> : null}</>;
}
