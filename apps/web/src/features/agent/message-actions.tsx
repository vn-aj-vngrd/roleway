"use client";

import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rateAgentMessage } from "@/app/(app)/agent/actions";
import { formatMessageTimestamp } from "./message-time";

export function MessageActions({
  content,
  timestamp,
  messageId,
  rating,
}: {
  content: string;
  timestamp: string;
  messageId?: string | undefined;
  rating?: "good" | "bad" | null;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [selectedRating, setSelectedRating] = useState(rating ?? null);
  const [showReasons, setShowReasons] = useState(false);
  const [reason, setReason] = useState<"incorrect" | "wrong_context" | "unsafe" | "unhelpful" | "other">("incorrect");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  function saveRating(nextRating: "good" | "bad", nextReason: typeof reason | null) {
    if (!messageId) return;
    startTransition(async () => {
      try {
        const result = await rateAgentMessage({ messageId, rating: nextRating, reason: nextReason });
        if (!result.ok) throw new Error("rating_save_failed");
        setSelectedRating(nextRating);
        setShowReasons(false);
        setFeedback("Feedback saved");
      } catch {
        setFeedback("Feedback could not be saved. Try again.");
      }
    });
  }
  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return (
    <div className="agent-message-actions">
      <MessageTimestamp value={timestamp} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={status === "copied" ? "Message copied" : "Copy message"}
        data-tooltip={status === "copied" ? "Copied" : "Copy message"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
        }}
      >
        {status === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </Button>
      {messageId ? <>
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label="Good response" aria-pressed={selectedRating === "good"} data-tooltip="Good response" onClick={() => saveRating("good", null)}><ThumbsUp aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label="Bad response" aria-pressed={selectedRating === "bad"} data-tooltip="Bad response" onClick={() => setShowReasons(value => !value)}><ThumbsDown aria-hidden="true" /></Button>
        {showReasons ? <span className="agent-rating-reason"><label htmlFor={`rating-reason-${messageId}`}>What went wrong?</label><select id={`rating-reason-${messageId}`} value={reason} onChange={event => setReason(event.target.value as typeof reason)}><option value="incorrect">Incorrect answer</option><option value="wrong_context">Wrong context</option><option value="unsafe">Unsafe suggestion</option><option value="unhelpful">Unhelpful response</option><option value="other">Other</option></select><Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => saveRating("bad", reason)}>Send feedback</Button></span> : null}
        <span role="status" className={feedback.includes("could not") ? undefined : "sr-only"}>{feedback}</span>
      </> : null}
      <span
        className={status === "failed" ? undefined : "sr-only"}
        role="status"
      >
        {status === "failed"
          ? "Could not copy. Select the message text to copy it."
          : status === "copied"
            ? "Message copied"
            : ""}
      </span>
    </div>
  );
}

const subscribe = () => () => {};
export function MessageTimestamp({ value }: { value: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time className="agent-message-timestamp" dateTime={value}>
      {mounted ? formatMessageTimestamp(value) : ""}
    </time>
  );
}
