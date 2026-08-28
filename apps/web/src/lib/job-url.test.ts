import { describe, expect, it } from "vitest";
import { extractJobFromHtml, isPrivateAddress, normalizeJobUrl } from "./job-url";

describe("job URL safety", () => {
  it("normalizes tracking parameters and rejects credentialed or non-web URLs", () => {
    expect(normalizeJobUrl("https://jobs.example.com/role?id=42&utm_source=linkedin#apply")).toBe("https://jobs.example.com/role?id=42");
    expect(() => normalizeJobUrl("https://user:secret@example.com/role")).toThrow(/credentials/);
    expect(() => normalizeJobUrl("file:///etc/passwd")).toThrow(/http or https/);
  });

  it("recognizes private and loopback address ranges", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.2.3.4")).toBe(true);
    expect(isPrivateAddress("172.20.1.5")).toBe(true);
    expect(isPrivateAddress("192.168.1.8")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});

describe("job page extraction", () => {
  it("extracts provided JobPosting fields without inventing absent details", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Senior Product Engineer",
      hiringOrganization: { "@type": "Organization", name: "Northstar Systems" },
      description: "<p>Build <strong>dependable</strong> product systems.</p><img src=x onerror=alert(1)>",
      jobLocationType: "TELECOMMUTE",
      jobLocation: { address: { addressLocality: "New York", addressRegion: "NY", addressCountry: "US" } },
      baseSalary: { currency: "USD", value: { minValue: 165000, maxValue: 190000, unitText: "YEAR" } },
      datePosted: "2026-08-20",
      url: "/apply",
    })}</script></head></html>`;
    expect(extractJobFromHtml(html, "https://jobs.example.com/role")).toEqual({
      sourceUrl: "https://jobs.example.com/role",
      title: "Senior Product Engineer",
      company: "Northstar Systems",
      description: "<p>Build <strong>dependable</strong> product systems.</p>",
      location: "New York, NY, US",
      compensation: "USD 165,000–190,000 / year",
      remotePolicy: "Remote",
      applicationUrl: "https://jobs.example.com/apply",
      datePosted: "2026-08-20",
    });
  });

  it("uses observable metadata as a fallback and leaves unknown fields empty", () => {
    const result = extractJobFromHtml('<meta property="og:title" content="Frontend Engineer"><meta name="description" content="Build accessible interfaces.">', "https://example.com/job");
    expect(result.title).toBe("Frontend Engineer");
    expect(result.description).toBe("Build accessible interfaces.");
    expect(result.company).toBe("");
    expect(result.compensation).toBe("");
  });
});
