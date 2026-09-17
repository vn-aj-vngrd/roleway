"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function LocalDateTime({ value }: { value: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <time className="muted small" dateTime={value}>{mounted ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : ""}</time>;
}
