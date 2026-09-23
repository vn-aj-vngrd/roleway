const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; }
  catch { return false; }
}

/** Converts a wall-clock value in an IANA time zone into an absolute ISO timestamp. */
export function zonedDateTimeToIso(value: string, timeZone: string) {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
    const absolute = new Date(value);
    if (Number.isNaN(absolute.getTime())) throw new Error("Invalid date and time.");
    return absolute.toISOString();
  }
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match) throw new Error("Invalid date and time.");
  if (!isValidTimeZone(timeZone)) throw new Error("Enter a valid IANA timezone, such as America/New_York.");
  const [, year, month, day, hour, minute] = match;
  const targetWallClock = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = targetWallClock;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedWallClock = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const correction = targetWallClock - representedWallClock;
    instant += correction;
    if (correction === 0) break;
  }
  const result = new Date(instant);
  const rendered = Object.fromEntries(formatter.formatToParts(result).map((part) => [part.type, part.value]));
  if (Number(rendered.year) !== Number(year) || Number(rendered.month) !== Number(month) || Number(rendered.day) !== Number(day) || Number(rendered.hour) !== Number(hour) || Number(rendered.minute) !== Number(minute)) {
    throw new Error("That local time does not exist in the selected timezone.");
  }
  return result.toISOString();
}

export function formDateTimeToIso(formData: FormData, fieldName: string, explicitTimeZone?: string) {
  const value = String(formData.get(fieldName) ?? "");
  if (!value) return null;
  const timeZone = explicitTimeZone || String(formData.get(`${fieldName}Timezone`) ?? "UTC");
  return zonedDateTimeToIso(value, timeZone);
}
