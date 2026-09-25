"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "./message-time";

export function MessageActions({
  content,
  timestamp,
}: {
  content: string;
  timestamp: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
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
