import { describe, expect, it } from "vitest";
import { isValidTimeZone, zonedDateTimeToIso } from "./datetime";

describe("zonedDateTimeToIso", () => {
  it("converts a wall-clock interview time using its IANA timezone", () => {
    expect(zonedDateTimeToIso("2026-08-28T09:00", "America/New_York")).toBe("2026-08-28T13:00:00.000Z");
    expect(zonedDateTimeToIso("2026-08-28T09:00", "Australia/Sydney")).toBe("2026-08-27T23:00:00.000Z");
  });

  it("preserves timestamps that already carry an offset", () => {
    expect(zonedDateTimeToIso("2026-08-28T09:00:00-04:00", "UTC")).toBe("2026-08-28T13:00:00.000Z");
  });

  it("rejects invalid zones and nonexistent daylight-saving times", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(() => zonedDateTimeToIso("2026-03-08T02:30", "America/New_York")).toThrow(/does not exist/);
  });
});
