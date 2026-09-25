"use client";

import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronRight, Circle, Cpu, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  model?: { provider: string; name: string; inputTokens: number | null; outputTokens: number | null };
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!recovering || !pending || refreshing) return;
    // Wait for each RSC refresh to commit. Overlapping refreshes can repeatedly
    // abort a slow response, leaving a completed run stuck on "Working".
    const timer = window.setTimeout(() => startRefresh(() => router.refresh()), 3000);
    return () => window.clearTimeout(timer);
  }, [recovering, pending, refreshing, router]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - Date.parse(startedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [pending, startedAt]);
  const duration = pending ? elapsed : endedAt ? Date.parse(endedAt) - Date.parse(startedAt) : undefined;
  const current = [...steps].reverse().find(step => step.status === "active");
  return <><details className="agent-work-timeline">
    <summary>
      {pending ? <Spinner className="agent-working-spinner" aria-hidden="true" /> : null}
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
      {model ? <div className="agent-run-usage" aria-label="Model and token usage">
        <div className="agent-run-identity"><Cpu aria-hidden="true" /><span><span className="agent-run-provider">{model.provider}</span><span className="agent-run-name">{model.name}</span></span></div>
        <dl className="agent-run-tokens">
          {model.inputTokens !== null ? <div><dt><ArrowUpFromLine aria-hidden="true" />Input tokens</dt><dd>{model.inputTokens.toLocaleString("en-US")}</dd></div> : null}
          {model.outputTokens !== null ? <div><dt><ArrowDownToLine aria-hidden="true" />Output tokens</dt><dd>{model.outputTokens.toLocaleString("en-US")}</dd></div> : null}
        </dl>
      </div> : null}
    </div>
  </details>{pending ? <p className="agent-working-current" role="status">{current?.label ?? "Preparing the response…"}</p> : null}</>;
}
