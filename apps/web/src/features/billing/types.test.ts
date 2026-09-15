import { describe, expect, it } from "vitest";
import { capacityError, formatBytes, formatPrice } from "./types";
describe("plan presentation", () => {
  it("uses binary units for the measured content allowance", () => {
    expect(formatBytes(10485760)).toBe("10 MiB");
    expect(formatBytes(512)).toBe("512 B");
  });
  it("formats minor currency units without losing cents", () => {
    expect(formatPrice(14950, "PHP")).toContain("149.50");
  });
  it("gives actionable quota errors without exposing database details", () => {
    expect(
      capacityError({ message: "PLAN_STORAGE_LIMIT" }, "Failed"),
    ).toContain("Settings → Plan & billing");
    expect(
      capacityError({ message: "PLAN_WORKSPACE_LIMIT" }, "Failed"),
    ).toContain("Archive");
    expect(
      capacityError({ message: "private database internals" }, "Failed"),
    ).toBe("Failed");
  });
});
