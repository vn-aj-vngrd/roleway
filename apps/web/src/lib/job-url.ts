import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sanitizeHtml from "sanitize-html";
import { sanitizeRichText } from "./rich-text";

export type ExtractedJob = {
  sourceUrl: string;
  title: string;
  company: string;
  description: string;
  location: string;
  compensation: string;
  remotePolicy: string;
  applicationUrl: string;
  datePosted: string | null;
};

const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const TRACKING_PARAMETERS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "referrer"];

export function normalizeJobUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Use an http or https job URL.");
  if (url.username || url.password) throw new Error("Job URLs cannot contain credentials.");
  if (url.port && !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80"))) throw new Error("Job URLs must use a standard web port.");
  url.hash = "";
  TRACKING_PARAMETERS.forEach((parameter) => url.searchParams.delete(parameter));
  return url.toString();
}

export function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mapped ? isPrivateAddress(mapped) : false;
  }
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const first = octets[0]!;
  const second = octets[1]!;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && (second === 0 || second === 168))
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

async function assertPublicUrl(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Local and private job URLs are not supported.");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Local and private job URLs are not supported.");
    return;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("That job URL does not resolve to a public website.");
}

export async function importJobFromUrl(value: string) {
  const normalized = normalizeJobUrl(value);
  const url = new URL(normalized);
  const atsResult = await fetchKnownAtsJob(url);
  if (atsResult) return atsResult;
  const page = await fetchJobPage(normalized);
  return extractJobFromHtml(page.html, page.url);
}

async function fetchKnownAtsJob(url: URL): Promise<ExtractedJob | null> {
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "jobs.ashbyhq.com" && segments.length >= 2 && safeAtsSegment(segments[0]) && safeAtsSegment(segments[1])) {
    const payload = recordValue(await fetchTrustedJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(segments[0])}?includeCompensation=true`));
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    const job = recordValue(jobs.find((candidate) => recordValue(candidate)?.id === segments[1]));
    if (!job) throw new Error("That Ashby job is no longer available.");
    const compensation = recordValue(job.compensation);
    return {
      sourceUrl: url.toString(),
      title: cleanText(stringValue(job.title)),
      company: "",
      description: sanitizeRichText(stringValue(job.descriptionHtml)),
      location: cleanText(stringValue(job.location)),
      compensation: cleanText(stringValue(compensation?.compensationTierSummary) || stringValue(compensation?.scrapeableCompensationSalarySummary)),
      remotePolicy: cleanText(stringValue(job.workplaceType) || (job.isRemote === true ? "Remote" : "")),
      applicationUrl: safeExternalUrl(stringValue(job.applyUrl), url.toString()) || url.toString(),
      datePosted: isoDate(stringValue(job.publishedAt)),
    };
  }

  if ((url.hostname === "boards.greenhouse.io" || url.hostname === "job-boards.greenhouse.io") && segments.length >= 3 && segments[1] === "jobs" && safeAtsSegment(segments[0]) && /^\d+$/.test(segments[2]!)) {
    const job = recordValue(await fetchTrustedJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(segments[0]!)}/jobs/${encodeURIComponent(segments[2]!)}?content=true`));
    if (!job) throw new Error("That Greenhouse job is no longer available.");
    const location = recordValue(job.location);
    return {
      sourceUrl: url.toString(),
      title: cleanText(stringValue(job.title)),
      company: "",
      description: sanitizeRichText(stringValue(job.content)),
      location: cleanText(stringValue(location?.name)),
      compensation: "",
      remotePolicy: "",
      applicationUrl: safeExternalUrl(stringValue(job.absolute_url), url.toString()) || url.toString(),
      datePosted: isoDate(stringValue(job.updated_at)),
    };
  }

  if (url.hostname === "jobs.lever.co" && segments.length >= 2 && safeAtsSegment(segments[0]) && safeAtsSegment(segments[1])) {
    const job = recordValue(await fetchTrustedJson(`https://api.lever.co/v0/postings/${encodeURIComponent(segments[0])}/${encodeURIComponent(segments[1])}?mode=json`));
    if (!job) throw new Error("That Lever job is no longer available.");
    const categories = recordValue(job.categories);
    const salary = recordValue(job.salaryRange);
    const descriptionParts = [stringValue(job.description), ...(Array.isArray(job.lists) ? job.lists.map((item) => stringValue(recordValue(item)?.content)) : [])].filter(Boolean);
    return {
      sourceUrl: url.toString(),
      title: cleanText(stringValue(job.text)),
      company: "",
      description: sanitizeRichText(descriptionParts.join("")),
      location: cleanText(stringValue(categories?.location) || stringValue(job.workplaceType)),
      compensation: salary ? salaryFromRange(salary) : "",
      remotePolicy: cleanText(stringValue(job.workplaceType)),
      applicationUrl: safeExternalUrl(stringValue(job.applyUrl), url.toString()) || url.toString(),
      datePosted: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString().slice(0, 10) : null,
    };
  }
  return null;
}

async function fetchTrustedJson(value: string) {
  const response = await fetch(value, { cache: "no-store", signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "Roleway Job Capture/1.0 (+https://roleway.vercel.app)" } });
  if (!response.ok) throw new Error(response.status === 404 ? "That job is no longer available." : "The job page could not be loaded.");
  const text = await readLimitedText(response, MAX_HTML_BYTES);
  try { return JSON.parse(text) as unknown; } catch { throw new Error("The job provider returned an unreadable response."); }
}

function safeAtsSegment(value: string | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9_-]{1,120}$/.test(value));
}

function salaryFromRange(value: Record<string, unknown>) {
  const minimum = numberValue(value.min);
  const maximum = numberValue(value.max);
  const currency = stringValue(value.currency);
  const interval = stringValue(value.interval).toLowerCase();
  if (minimum === null && maximum === null) return "";
  const amount = minimum !== null && maximum !== null ? `${minimum.toLocaleString()}–${maximum.toLocaleString()}` : minimum !== null ? `${minimum.toLocaleString()}+` : `Up to ${maximum!.toLocaleString()}`;
  return [currency, amount, interval ? `/ ${interval}` : ""].filter(Boolean).join(" ");
}

export async function fetchJobPage(value: string) {
  let current = normalizeJobUrl(value);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Roleway Job Capture/1.0 (+https://roleway.vercel.app)" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("The job page redirected too many times.");
      current = normalizeJobUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(response.status === 403 ? "That site blocked automated capture. Add the job details manually." : "The job page could not be loaded.");
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("That URL does not point to a web job page.");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_HTML_BYTES) throw new Error("That job page is too large to import safely.");
    return { html: await readLimitedText(response, MAX_HTML_BYTES), url: current };
  }
  throw new Error("The job page could not be loaded.");
}

async function readLimitedText(response: Response, byteLimit: number) {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > byteLimit) {
      await reader.cancel();
      throw new Error("That job page is too large to import safely.");
    }
    output += decoder.decode(value, { stream: true });
  }
  output += decoder.decode();
  return output;
}

export function extractJobFromHtml(html: string, sourceUrl: string): ExtractedJob {
  const jobPosting = findJobPosting(extractJsonLd(html));
  const title = cleanText(stringValue(jobPosting?.title) || metaContent(html, "property", "og:title") || titleTag(html));
  const company = cleanText(stringValue(recordValue(jobPosting?.hiringOrganization)?.name) || metaContent(html, "property", "og:site_name"));
  const descriptionSource = stringValue(jobPosting?.description) || metaContent(html, "property", "og:description") || metaContent(html, "name", "description");
  const description = descriptionSource ? sanitizeRichText(descriptionSource) : "";
  const location = jobLocation(jobPosting);
  const remotePolicy = remoteLabel(jobPosting);
  const compensation = salaryLabel(jobPosting);
  const applicationUrl = safeExternalUrl(stringValue(jobPosting?.url), sourceUrl) || sourceUrl;
  const datePosted = isoDate(stringValue(jobPosting?.datePosted));

  return { sourceUrl, title, company, description, location, compensation, remotePolicy, applicationUrl, datePosted };
}

function extractJsonLd(html: string) {
  const values: unknown[] = [];
  const expression = /<script\b[^>]*type\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(expression)) {
    try { values.push(JSON.parse(match[1]!.trim())); } catch { /* Invalid JSON-LD is ignored. */ }
  }
  return values;
}

function findJobPosting(values: unknown[]): Record<string, unknown> | null {
  const queue = [...values];
  while (queue.length) {
    const value = queue.shift();
    if (Array.isArray(value)) { queue.push(...value); continue; }
    const record = recordValue(value);
    if (!record) continue;
    const type = record["@type"];
    if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return record;
    if (record["@graph"]) queue.push(record["@graph"]);
  }
  return null;
}

function metaContent(html: string, key: "name" | "property", value: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attributes = parseAttributes(tag);
    if (attributes[key]?.toLowerCase() === value.toLowerCase()) return attributes.content ?? "";
  }
  return "";
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const expression = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(expression)) attributes[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  return attributes;
}

function titleTag(html: string) {
  return html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
}

function cleanText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

function jobLocation(job: Record<string, unknown> | null) {
  if (!job) return "";
  const locations = Array.isArray(job.jobLocation) ? job.jobLocation : job.jobLocation ? [job.jobLocation] : [];
  const labels = locations.flatMap((location) => {
    const record = recordValue(location);
    const address = recordValue(record?.address);
    if (!address) return [];
    const label = [stringValue(address.addressLocality), stringValue(address.addressRegion), stringValue(address.addressCountry)].filter(Boolean).join(", ");
    return label ? [label] : [];
  });
  return Array.from(new Set(labels)).join(" / ");
}

function remoteLabel(job: Record<string, unknown> | null) {
  if (!job) return "";
  const mode = stringValue(job.jobLocationType).toUpperCase();
  if (mode.includes("TELECOMMUTE")) return "Remote";
  return "";
}

function salaryLabel(job: Record<string, unknown> | null) {
  const base = recordValue(job?.baseSalary);
  if (!base) return "";
  const value = recordValue(base.value);
  const currency = stringValue(base.currency);
  const minimum = numberValue(value?.minValue) ?? numberValue(base.minValue);
  const maximum = numberValue(value?.maxValue) ?? numberValue(base.maxValue);
  const exact = numberValue(value?.value) ?? numberValue(base.value);
  const unit = stringValue(value?.unitText || base.unitText).toLowerCase();
  const amount = minimum !== null && maximum !== null ? `${minimum.toLocaleString()}–${maximum.toLocaleString()}` : exact !== null ? exact.toLocaleString() : minimum !== null ? `${minimum.toLocaleString()}+` : maximum !== null ? `Up to ${maximum.toLocaleString()}` : "";
  return amount ? [currency, amount, unit ? `/ ${unit}` : ""].filter(Boolean).join(" ") : "";
}

function safeExternalUrl(value: string, base: string) {
  if (!value) return "";
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
}

function isoDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
