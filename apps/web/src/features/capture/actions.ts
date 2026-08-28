"use server";

import { z } from "zod";
import { requireSearchContext } from "@/features/projects/context";
import { importJobFromUrl, normalizeJobUrl, type ExtractedJob } from "@/lib/job-url";

export type JobUrlCaptureState =
  | { status: "idle"; message: ""; values: null }
  | { status: "success"; message: string; values: ExtractedJob }
  | { status: "error"; message: string; values: null };

export async function inspectJobUrl(_previous: JobUrlCaptureState, formData: FormData): Promise<JobUrlCaptureState> {
  const parsed = z.string().trim().url("Enter a complete job URL.").max(2000).safeParse(formData.get("captureUrl") ?? formData.get("sourceUrl"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a complete job URL.", values: null };
  const projectId = z.string().uuid().safeParse(formData.get("projectId"));
  const context = await requireSearchContext();
  if (!context?.project || !projectId.success) return { status: "error", message: "Choose an available workspace before importing a job.", values: null };
  const project = context.projects.find((candidate) => candidate.id === projectId.data);
  if (!project) return { status: "error", message: "That workspace is no longer available.", values: null };

  let normalized: string;
  try { normalized = normalizeJobUrl(parsed.data); }
  catch (error) { return { status: "error", message: safeCaptureError(error), values: null }; }

  const { data: duplicate } = await context.supabase.from("jobs").select("id").eq("project_id", project.id).eq("source_url", normalized).maybeSingle();
  if (duplicate) return { status: "error", message: `This URL is already saved in ${project.name}.`, values: null };
  const { data: allowed, error: quotaError } = await context.supabase.rpc("consume_job_capture_quota");
  if (quotaError || allowed !== true) return { status: "error", message: "Job URL capture is limited to 20 attempts per hour. Add the role manually or try again later.", values: null };

  try {
    const values = await importJobFromUrl(normalized);
    const extracted = [values.title, values.company, values.description, values.location, values.compensation].filter(Boolean).length;
    if (extracted < 2) return { status: "error", message: "That page did not expose enough recognizable job details. Add the role manually instead.", values: null };
    const missing = [!values.title && "title", !values.company && "company", !values.description && "description"].filter(Boolean);
    return {
      status: "success",
      message: missing.length ? `Imported the details the page exposed. Add the missing ${missing.join(" and ")} before saving.` : "Job details imported. Review every field before saving.",
      values,
    };
  } catch (error) {
    return { status: "error", message: safeCaptureError(error), values: null };
  }
}

function safeCaptureError(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError") return "The job page took too long to respond. Add the details manually instead.";
  if (error instanceof Error) {
    const expected = [
      "Use an http or https job URL.",
      "Job URLs cannot contain credentials.",
      "Job URLs must use a standard web port.",
      "Local and private job URLs are not supported.",
      "That job URL does not resolve to a public website.",
      "The job page redirected too many times.",
      "That site blocked automated capture. Add the job details manually.",
      "The job page could not be loaded.",
      "That URL does not point to a web job page.",
      "That job page is too large to import safely.",
      "That job is no longer available.",
      "That Ashby job is no longer available.",
      "That Greenhouse job is no longer available.",
      "That Lever job is no longer available.",
      "The job provider returned an unreadable response.",
    ];
    if (expected.includes(error.message)) return error.message;
  }
  return "The job page could not be imported. Add the details manually instead.";
}
