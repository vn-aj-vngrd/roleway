export function formatMessageTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDay(date, now) ? "Today" : sameDay(date, yesterday) ? "Yesterday" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } as const : {}) });
  return `${day} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
}
