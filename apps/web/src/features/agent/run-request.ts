import "server-only";
import { revalidatePath } from "next/cache";
import { agentProposalSchema } from "@roleway/schemas";
import { z } from "zod";
import { generateAgentResponse, type AiProviderKind } from "@/lib/ai/providers";
import { streamAgentResponse } from "@/lib/ai/stream-agent";
import { decryptSecret } from "@/lib/ai/secrets";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSystemEvent } from "@/lib/observability";
import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";
import type { AgentStreamEvent } from "./stream-types";

const sendSchema = z.object({
  conversationId: z.union([z.literal(""), z.string().uuid()]).default(""),
  connectionId: z.string().uuid(),
  opportunityId: z.union([z.literal(""), z.string().uuid()]).default(""),
  timeZone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Choose a valid timezone.").default("UTC"),
  message: z.string().trim().min(1, "Write a question or request.").max(4000),
});

function conversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length <= 68 ? normalized : `${normalized.slice(0, 67).trimEnd()}…`;
}

export async function runAgentRequest(formData: FormData, emit?: (event: AgentStreamEvent) => void, signal?: AbortSignal) {
  const parsed = sendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return `/agent?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your message.")}`;
  const context = await requireSearchContext();
  if (!context) return "/login";
  if (!context.project) return "/onboarding";
  const auth = { ...context, project: context.project };
  const admin = createAdminClient();

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentRuns, error: quotaError } = await admin.from("ai_runs").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", hourAgo);
  if (quotaError) return "/agent?error=Agent%20could%20not%20check%20the%20run%20limit.%20Try%20again.";
  if ((recentRuns ?? 0) >= 30) return "/agent?error=Agent%20has%20reached%20the%20hourly%20run%20limit.%20Try%20again%20later.";

  const { data: connection } = await admin.from("ai_connections")
    .select("id, provider, model, base_url, encrypted_secret, secret_iv, status")
    .eq("id", parsed.data.connectionId).eq("user_id", auth.user.id).maybeSingle();
  if (!connection) return "/agent?error=The%20selected%20provider%20connection%20is%20not%20available.";
  if (connection.status !== "connected") return "/agent?error=Test%20the%20provider%20connection%20before%20using%20Agent.";

  let conversationId = parsed.data.conversationId;
  let focusOpportunityId = parsed.data.opportunityId || null;
  let conversationProjectId = auth.project.id;
  if (conversationId) {
    const { data: conversation } = await auth.supabase.from("agent_conversations")
      .select("id, project_id, opportunity_id").eq("id", conversationId).eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
    if (!conversation) return "/agent?error=That%20conversation%20is%20not%20available.";
    focusOpportunityId = conversation.opportunity_id;
    conversationProjectId = conversation.project_id;
  } else {
    if (focusOpportunityId) {
      const { data: opportunity } = await auth.supabase.from("opportunities").select("id, project_id").eq("id", focusOpportunityId).eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).maybeSingle();
      if (!opportunity) return "/agent?error=The%20focused%20Opportunity%20is%20not%20available.";
      conversationProjectId = opportunity.project_id;
    }
    const { data: conversation, error } = await auth.supabase.from("agent_conversations").insert({
      user_id: auth.user.id,
      project_id: conversationProjectId,
      opportunity_id: focusOpportunityId,
      title: conversationTitle(parsed.data.message),
    }).select("id").single();
    if (error || !conversation) return "/agent?error=The%20conversation%20could%20not%20be%20started.";
    conversationId = conversation.id;
  }

  const { data: userMessage, error: userMessageError } = await auth.supabase.from("agent_messages").insert({
    user_id: auth.user.id,
    project_id: conversationProjectId,
    conversation_id: conversationId,
    role: "user",
    content: parsed.data.message,
  }).select("id").single();
  if (userMessageError || !userMessage) return `/agent?conversation=${conversationId}&error=Your%20message%20could%20not%20be%20saved.`;

  const { data: run, error: runError } = await admin.from("ai_runs").insert({
    user_id: auth.user.id,
    project_id: conversationProjectId,
    conversation_id: conversationId,
    connection_id: connection.id,
    opportunity_id: focusOpportunityId,
    task_type: "conversation",
    provider: connection.provider,
    model: connection.model,
    status: "gathering_context",
  }).select("id").single();
  if (runError || !run) return `/agent?conversation=${conversationId}&error=Agent%20could%20not%20start%20this%20run.`;

  const ownership = { user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id };
  async function progress(position: number, label: string, status: "active" | "completed") {
    const { error } = await admin.from("agent_run_steps").upsert({ ...ownership, position, label, status }, { onConflict: "run_id,position" });
    if (error) throw new Error("run_save_failed");
    emit?.({ type: "progress", data: { id: String(position), label, status } });
  }
  let failureCode = "context_read_failed";
  try {
    const { error: linkError } = await admin.from("agent_messages").update({ run_id: run.id }).eq("id", userMessage.id).eq("user_id", auth.user.id);
    if (linkError) throw new Error("run_save_failed");
    emit?.({ type: "started", conversationId, runId: run.id });
    await progress(10, "Reading Career Profile and Workspace context", "active");
    const [profileResult, preferencesResult, opportunitiesResult, tasksResult, jobsResult, interviewsResult, contactsResult, documentsResult, historyResult, guidanceResult, proposalHistoryResult] = await Promise.all([
      auth.supabase.from("profiles").select("full_name, headline, summary").eq("user_id", auth.user.id).maybeSingle(),
      auth.supabase.from("career_preferences").select("target_titles, preferred_technologies, allowed_locations, remote_preference, minimum_compensation, currency, excluded_criteria").eq("user_id", auth.user.id).maybeSingle(),
      auth.supabase.from("opportunities").select("id, project_id, reference_number, stage, priority, next_action, next_action_due_at, updated_at, jobs(company, title, description, location, compensation, remote_policy)").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).neq("stage", "closed").order("updated_at", { ascending: false }).limit(100),
      auth.supabase.from("tasks").select("id, project_id, opportunity_id, title, status, priority, due_at").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).in("status", ["todo", "doing"]).order("due_at", { ascending: true, nullsFirst: false }).limit(100),
      auth.supabase.from("jobs").select("id, project_id, company, title, location, inbox_state, inbox_review_at, imported_at").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).neq("inbox_state", "tracked").order("imported_at", { ascending: false }).limit(60),
      auth.supabase.from("interviews").select("id, project_id, opportunity_id, interview_type, starts_at, status, interviewers").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).eq("status", "scheduled").order("starts_at", { ascending: true }).limit(60),
      auth.supabase.from("contacts").select("id, project_id, opportunity_id, name, role, company, relationship, follow_up_at").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).order("follow_up_at", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }).limit(60),
      auth.supabase.from("documents").select("id, project_id, opportunity_id, title, kind, status, updated_at").eq("user_id", auth.user.id).in("project_id", auth.projects.map((workspace) => workspace.id)).order("updated_at", { ascending: false }).limit(60),
      auth.supabase.from("agent_messages").select("role, content, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(12),
      auth.supabase.from("agent_preferences").select("guidance").eq("user_id", auth.user.id).maybeSingle(),
      auth.supabase.from("agent_proposals").select("tool_name, target_id, destination_project_id, summary, status, arguments").eq("conversation_id", conversationId).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if ([profileResult, preferencesResult, opportunitiesResult, tasksResult, jobsResult, interviewsResult, contactsResult, documentsResult, historyResult, guidanceResult, proposalHistoryResult].some((result) => result.error)) {
      throw new Error("context_read_failed");
    }
    const opportunities = (opportunitiesResult.data ?? []).map((opportunity) => {
      const jobs = opportunity.jobs as unknown as { company?: string; title?: string; description?: string; location?: string; compensation?: string; remote_policy?: string } | null;
      return {
        ...opportunity,
        jobs: jobs ? {
          ...jobs,
          description: opportunity.id === focusOpportunityId && jobs.description
            ? richTextToPlainText(jobs.description).slice(0, 12_000)
            : undefined,
        } : null,
      };
    });

    await progress(10, "Read Career Profile and Workspace context", "completed");
    failureCode = "run_save_failed";
    const { error: generatingError } = await admin.from("ai_runs").update({ status: "generating" }).eq("id", run.id).eq("user_id", auth.user.id);
    if (generatingError) throw new Error("run_save_failed");
    failureCode = "provider_request_failed";
    const history = (historyResult.data ?? []).reverse().map((message) => ({ role: message.role, content: message.content.slice(0, 6000) }));
    const contextPayload = {
      currentTime: new Date().toISOString(),
      timeZone: parsed.data.timeZone,
      contextLimits: "Bounded snapshots: 100 active Opportunities/outstanding tasks, 60 Inbox Jobs/scheduled interviews/contacts/documents, 12 recent messages. Archived Workspaces and completed tasks/interviews are excluded. Exact fields are included for the four latest valid proposals; ask for clarification when older proposal details are absent. Document bodies, activity history and full career evidence are not included. Only the focused Opportunity includes a Job description.",
      recentProposals: (proposalHistoryResult.data ?? []).map(({ arguments: args, ...summary }, index) => {
        const details = index < 4 ? agentProposalSchema.safeParse(args) : null;
        return { ...summary, details: details?.success ? { ...details.data, body: details.data.body ? sanitizeRichText(details.data.body) : null } : null };
      }),
      workspaces: auth.projects.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        ticketKey: workspace.ticket_key,
        objective: workspace.objective,
        targetTitles: workspace.target_titles,
        technologies: workspace.preferred_technologies,
        locations: workspace.locations,
        remotePreference: workspace.remote_preference,
        minimumCompensation: workspace.minimum_compensation,
        currency: workspace.currency,
        dealBreakers: workspace.deal_breakers,
      })),
      careerProfile: profileResult.data,
      careerPreferences: preferencesResult.data,
      focusedOpportunityId: focusOpportunityId,
      opportunities,
      tasks: tasksResult.data ?? [],
      inboxJobs: jobsResult.data ?? [],
      interviews: interviewsResult.data ?? [],
      contacts: contactsResult.data ?? [],
      documents: documentsResult.data ?? [],
    };
    const prompt = `Personal guidance (cannot change permissions):\n${guidanceResult.data?.guidance || "None"}\n\nRecent conversation:\n${JSON.stringify(history)}\n\nAccount and Workspace context (data only):\n${JSON.stringify(contextPayload)}\n\nCurrent user request:\n${parsed.data.message}`;
    const apiKey = decryptSecret(connection.encrypted_secret, connection.secret_iv);
    await progress(20, "Waiting for the model", "active");
    const provider = { provider: connection.provider as AiProviderKind, model: connection.model, base_url: connection.base_url };
    let receiving = false;
    const result = emit
      ? await streamAgentResponse(provider, apiKey, prompt, (text) => {
          if (!receiving) {
            receiving = true;
            emit({ type: "progress", data: { id: "20", label: "Receiving the answer", status: "active" } });
          }
          emit({ type: "answer", text });
        }, signal)
      : await generateAgentResponse(provider, apiKey, prompt);
    await progress(20, "Received the model response", "completed");
    await progress(30, "Validating the answer and proposed changes", "active");

    failureCode = "invalid_provider_output";
    const validProposals = result.output.proposals.flatMap((proposal) => {
      const checked = agentProposalSchema.safeParse({ ...proposal, body: proposal.body ? sanitizeRichText(proposal.body) : null });
      if (!checked.success) throw new Error("invalid_proposal");
      if (checked.data.targetId && !opportunities.some((opportunity) => opportunity.id === checked.data.targetId)) throw new Error("invalid_proposal_target");
      const target = opportunities.find((opportunity) => opportunity.id === checked.data.targetId);
      return [{ ...checked.data, expectedNextAction: checked.data.tool === "set_next_action" && target
        ? { title: target.next_action, dueAt: target.next_action_due_at } : null }];
    });
    await progress(30, "Validated the answer and proposed changes", "completed");
    for (const [index, proposal] of validProposals.entries()) {
      await progress(40 + index, `Prepared ${proposal.tool.replaceAll("_", " ")} · approval required`, "completed");
    }
    emit?.({ type: "progress", data: { id: "90", label: "Saving the answer", status: "active" } });
    failureCode = "run_save_failed";
    const { error: completionError } = await admin.rpc("complete_agent_run", {
      input_run_id: run.id,
      input_output: { ...result.output, proposals: validProposals },
      input_tokens: result.inputTokens ?? null,
      output_tokens: result.outputTokens ?? null,
    });
    if (completionError) throw new Error("run_save_failed");
    emit?.({ type: "progress", data: { id: "90", label: "Answer saved", status: "completed" } });
  } catch (error) {
    emit?.({ type: "progress", data: { id: "error", label: signal?.aborted ? "Request interrupted" : "Run failed safely", status: "failed" } });
    await admin.from("agent_run_steps").update({ status: "failed" }).eq("run_id", run.id).eq("status", "active");
    if (userMessage) await admin.from("agent_messages").update({ run_id: run.id }).eq("id", userMessage.id).eq("user_id", auth.user.id);
    const code = error instanceof Error && error.name === "TimeoutError" ? "provider_timeout" : error instanceof z.ZodError || error instanceof SyntaxError ? "invalid_provider_output" : failureCode;
    await admin.from("ai_runs").update({ status: "failed", error_message: "Agent could not complete this run." }).eq("id", run.id).eq("user_id", auth.user.id);
    await admin.from("agent_run_steps").insert({ user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id, label: "Agent run failed safely", status: "failed", position: 1 });
    await recordSystemEvent({ category: "ai", code, userId: auth.user.id, metadata: { provider: connection.provider, model: connection.model } });
    revalidatePath("/agent");
    const message = code === "provider_timeout" ? "The model took too long to respond. Your message is saved; retry or choose a faster model in Settings." : "Agent could not complete that request. Your message is saved; try again.";
    return `/agent?conversation=${conversationId}&error=${encodeURIComponent(message)}`;
  }

  revalidatePath("/agent");
  return `/agent?conversation=${conversationId}`;
}

