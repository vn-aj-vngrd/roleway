export function formatMessageTimestamp(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDay(date, now) ? "Today" : sameDay(date, yesterday) ? "Yesterday" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } as const : {}) });
  return `${day} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

export function formatConversationAge(value: string, now = new Date()) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, (now.getTime() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const units = [
    [31_536_000, "year"],
    [2_592_000, "month"],
    [604_800, "week"],
    [86_400, "day"],
    [3_600, "hour"],
    [60, "minute"],
  ] as const;
  const [duration, unit] = units.find(([duration]) => seconds >= duration)!;
  const count = Math.floor(seconds / duration);
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
