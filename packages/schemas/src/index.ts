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

const agentWebUrl = z.string().url().refine(value => ["http:", "https:"].includes(new URL(value).protocol), "Use an HTTP or HTTPS URL.").nullable();
export const agentInterviewSchema = z.object({
  interviewType: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(5).max(1440),
  timezone: z.string().min(1).max(80).refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }, "Use a valid timezone."),
  meetingUrl: agentWebUrl,
  interviewers: z.string().trim().max(2000).nullable(),
});
export const agentContactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  relationship: z.enum(["recruiter", "hiring_manager", "interviewer", "referral", "colleague", "contact"]),
  role: z.string().trim().max(180).nullable(),
  company: z.string().trim().max(160).nullable(),
  email: z.string().email().nullable(),
  phone: z.string().trim().max(80).nullable(),
  profileUrl: agentWebUrl,
  notes: z.string().trim().max(20_000).nullable(),
  followUpAt: z.string().datetime({ offset: true }).nullable(),
});

export const agentToolSchema = z.enum(["create_workspace", "create_task", "set_next_action", "create_note", "create_interview", "create_contact"]);
export const agentProposalSchema = z.object({
  tool: agentToolSchema,
  workspaceId: z.string().uuid().nullable().optional(),
  interview: agentInterviewSchema.nullable().optional(),
  contact: agentContactSchema.nullable().optional(),
  supersedesProposalId: z.string().uuid().nullable().optional(),
  summary: z.string().trim().min(1).max(500),
  targetId: z.string().uuid().nullable(),
  title: z.string().trim().max(180).nullable(),
  body: z.string().trim().max(20_000).nullable(),
  dueAt: z.string().datetime().nullable(),
  name: z.string().trim().max(100).nullable(),
  objective: z.string().trim().max(500).nullable(),
}).superRefine((proposal, context) => {
  if (proposal.tool === "create_interview" && (!proposal.targetId || !proposal.interview)) context.addIssue({ code: "custom", message: "An Opportunity and complete interview schedule are required." });
  if (proposal.tool === "create_contact" && (!proposal.workspaceId || !proposal.contact)) context.addIssue({ code: "custom", message: "A Workspace and contact details are required." });

  if (proposal.tool === "create_workspace" && !proposal.objective) context.addIssue({ code: "custom", message: "A Workspace search objective is required." });
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

// Provider-only turn state. Persisted answers retain the existing response contract.
export const agentGenerationSchema = agentResponseSchema.extend({
  message: z.string().trim().max(12_000),
  clarification: z.enum(["workspace_name", "workspace_objective", "opportunity", "title", "note", "due_date_choice", "due_date", "workspace", "interview_type", "interview_time", "interview_duration", "contact_name", "contact_relationship"])
    .nullable()
    .describe("Choose the first missing or ambiguous detail before proposing a change. Use due_date for an ambiguous date/time, due_date_choice if the user has not chosen whether to set a date. Use null only when no clarification is needed. The server asks the question and discards proposals whenever this is non-null."),
}).superRefine((output, context) => {
  if (output.clarification === null && !output.message) context.addIssue({ code: "custom", path: ["message"], message: "An answer is required when no clarification is requested." });
});
export type AgentGeneration = z.infer<typeof agentGenerationSchema>;


export const agentSearchInputSchema = z.object({
  kind: z.enum(["opportunities", "jobs", "documents"]), query: z.string().max(100), offset: z.number().int().min(0).max(1200),
});
export const agentReadInputSchema = z.object({
  kind: z.enum(["opportunity", "job", "document", "career_profile", "conversation"]), id: z.string().uuid().nullable(), offset: z.number().int().min(0).max(1200),
});
