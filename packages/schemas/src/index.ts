import { z } from "zod";

export const opportunityStages = [
  "inbox",
  "interested",
  "preparing",
  "applied",
  "interview",
  "offer",
  "closed",
] as const;

export const opportunityStageSchema = z.enum(opportunityStages);
export type OpportunityStage = z.infer<typeof opportunityStageSchema>;

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(180),
  category: z.enum(["research", "application", "resume", "outreach", "preparation", "interview", "follow-up", "admin"]),
  status: z.enum(["todo", "doing", "done", "cancelled"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.string().datetime().nullable(),
  createdBy: z.enum(["user", "agent", "system"]),
});

export const jobImportSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("url"), url: z.string().url() }),
  z.object({ mode: z.literal("paste"), description: z.string().min(80).max(100_000) }),
  z.object({
    mode: z.literal("manual"),
    company: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(180),
    description: z.string().max(100_000).default(""),
  }),
]);

export const fitAnalysisSchema = z.object({
  overall: z.number().int().min(0).max(100),
  recommendation: z.enum(["strong_apply", "apply", "consider", "weak_match", "skip"]),
  dimensions: z.object({
    skills: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
    seniority: z.number().int().min(0).max(100),
    location: z.number().int().min(0).max(100),
    compensation: z.number().int().min(0).max(100),
    domain: z.number().int().min(0).max(100),
  }),
  strengths: z.array(z.string().min(1)).max(12),
  partials: z.array(z.string().min(1)).max(12),
  gaps: z.array(z.string().min(1)).max(12),
  mainRisk: z.string().min(1),
  evidenceIds: z.array(z.string()),
});

export const toolPermissionSchema = z.enum(["read", "internal_write", "reviewable_artifact", "external"]);
export type ToolPermission = z.infer<typeof toolPermissionSchema>;
