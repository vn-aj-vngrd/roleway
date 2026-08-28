import { z } from "zod";

export const opportunityStages = [
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

export const agentToolSchema = z.enum(["create_workspace", "create_task", "set_next_action", "create_note"]);
export const agentProposalSchema = z.object({
  tool: agentToolSchema,
  summary: z.string().trim().min(1).max(500),
  targetId: z.string().uuid().nullable(),
  title: z.string().trim().max(180).nullable(),
  body: z.string().trim().max(20_000).nullable(),
  dueAt: z.string().datetime().nullable(),
  name: z.string().trim().max(100).nullable(),
  objective: z.string().trim().max(500).nullable(),
}).superRefine((proposal, context) => {
  if (proposal.tool === "create_workspace" && !proposal.name) context.addIssue({ code: "custom", message: "A Workspace name is required." });
  if (["create_task", "set_next_action"].includes(proposal.tool) && (!proposal.targetId || !proposal.title)) context.addIssue({ code: "custom", message: "An Opportunity and title are required." });
  if (proposal.tool === "create_note" && (!proposal.targetId || !proposal.body)) context.addIssue({ code: "custom", message: "An Opportunity and note are required." });
});
export const agentResponseSchema = z.object({
  message: z.string().trim().min(1).max(12_000),
  proposals: z.array(agentProposalSchema).max(4),
});
export type AgentTool = z.infer<typeof agentToolSchema>;
export type AgentProposal = z.infer<typeof agentProposalSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
