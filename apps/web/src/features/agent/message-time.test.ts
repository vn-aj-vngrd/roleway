import { describe, expect, it } from "vitest";
import { formatMessageTimestamp } from "./message-time";
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
