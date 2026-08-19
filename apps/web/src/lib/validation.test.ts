import { describe, expect, it } from "vitest";
import { commaSeparatedList, jobFormSchema, safeNextPath } from "./validation";

describe("safeNextPath", () => {
  it("preserves an internal deep link", () => expect(safeNextPath("/opportunities/123?tab=notes")).toBe("/opportunities/123?tab=notes"));
  it.each(["https://evil.test", "//evil.test", "javascript:alert(1)", null])("rejects unsafe destinations", (value) => expect(safeNextPath(value)).toBe("/today"));
});

describe("commaSeparatedList", () => {
  it("trims, removes blanks, and deduplicates", () => expect(commaSeparatedList("React, TypeScript, React,  ")).toEqual(["React", "TypeScript"]));
});

describe("jobFormSchema", () => {
  const valid = { company: "Example", title: "Engineer", description: "", location: "", compensation: "", sourceUrl: "", applicationUrl: "", remotePolicy: "" };
  it("accepts a manual job without URLs", () => expect(jobFormSchema.safeParse(valid).success).toBe(true));
  it("rejects malformed source URLs", () => expect(jobFormSchema.safeParse({ ...valid, sourceUrl: "not a url" }).success).toBe(false));
  it("rejects empty company names", () => expect(jobFormSchema.safeParse({ ...valid, company: "  " }).success).toBe(false));
});
