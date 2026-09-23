import { describe, expect, it } from "vitest";
import { formatConversationAge, formatMessageTimestamp } from "./message-time";
import { matchingCapabilities } from "./capabilities";

describe("chat dates", () => {
  const now = new Date(2026, 0, 1, 0, 5);
  it("uses calendar days across year and midnight boundaries", () => {
    expect(formatMessageTimestamp(new Date(2026, 0, 1, 0, 1).toISOString(), now)).toMatch(/^Today /);
    expect(formatMessageTimestamp(new Date(2025, 11, 31, 23, 59).toISOString(), now)).toMatch(/^Yesterday /);
    expect(formatMessageTimestamp(new Date(2025, 11, 30).toISOString(), now)).not.toMatch(/Today|Yesterday/);
  });
  it("handles invalid timestamps", () => expect(formatMessageTimestamp("invalid", now)).toBe(""));
});
describe("action discovery", () => {
  it("matches grouped commands case-insensitively with multiple words", () => {
    expect(matchingCapabilities("CREATE task").map(item => item.label)).toEqual(["Task"]);
    expect(matchingCapabilities("explore")).toHaveLength(9);
    expect(matchingCapabilities("nonexistent")).toEqual([]);
  });
});

describe("conversation ages", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  it.each([
    [0, "Just now"], [59, "Just now"], [60, "1 minute ago"],
    [120, "2 minutes ago"], [3600, "1 hour ago"], [7200, "2 hours ago"],
    [86400, "1 day ago"], [259200, "3 days ago"],
    [604800, "1 week ago"], [1209600, "2 weeks ago"],
    [2592000, "1 month ago"], [31536000, "1 year ago"],
  ])("formats an age of %i seconds", (seconds, expected) => {
    expect(formatConversationAge(new Date(now.getTime() - seconds * 1000).toISOString(), now)).toBe(expected);
  });
  it("handles clock skew and invalid dates", () => {
    expect(formatConversationAge("2026-09-23T12:00:00Z", now)).toBe("Just now");
    expect(formatConversationAge("invalid", now)).toBe("");
  });
});
