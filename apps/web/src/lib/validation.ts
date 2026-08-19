import { z } from "zod";

export function safeNextPath(value: unknown, fallback = "/today") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function commaSeparatedList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

export const jobFormSchema = z.object({
  company: z.string().trim().min(1, "Enter the company name.").max(160),
  title: z.string().trim().min(1, "Enter the role title.").max(180),
  description: z.string().trim().max(100_000),
  location: z.string().trim().max(180),
  compensation: z.string().trim().max(120),
  sourceUrl: z.union([z.literal(""), z.string().url("Enter a valid job URL.")]),
  applicationUrl: z.union([z.literal(""), z.string().url("Enter a valid application URL.")]),
  remotePolicy: z.string().trim().max(120),
});

export const onboardingFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  headline: z.string().trim().min(3, "Add a short professional headline.").max(180),
  summary: z.string().trim().max(2000),
  targetTitles: z.string().trim().min(2, "Add at least one target role."),
  technologies: z.string().trim(),
  remotePreference: z.enum(["required", "preferred", "flexible"]),
  locations: z.string().trim(),
  minimumCompensation: z.coerce.number().int().min(0).max(10_000_000).optional(),
});
