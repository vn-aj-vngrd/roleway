"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentProposalSchema } from "@roleway/schemas";
import { z } from "zod";
import { generateAgentResponse, type AiProviderKind } from "@/lib/ai/providers";
import { decryptSecret } from "@/lib/ai/secrets";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSystemEvent } from "@/lib/observability";
import { richTextToPlainText } from "@/lib/rich-text";

const sendSchema = z.object({
  conversationId: z.union([z.literal(""), z.string().uuid()]).default(""),
  connectionId: z.string().uuid(),
  opportunityId: z.union([z.literal(""), z.string().uuid()]).default(""),
  message: z.string().trim().min(1, "Write a question or request.").max(4000),
});

const proposalDecisionSchema = z.object({ proposalId: z.string().uuid(), decision: z.enum(["approve", "reject"]) });

async function authenticated() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  return { ...context, project: context.project };
}

function conversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length <= 68 ? normalized : `${normalized.slice(0, 67).trimEnd()}…`;
}

export async function sendAgentMessage(formData: FormData) {
  const parsed = sendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/agent?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your message.")}`);
  const auth = await authenticated();
  const admin = createAdminClient();

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentRuns } = await admin.from("ai_runs").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).gte("created_at", hourAgo);
  if ((recentRuns ?? 0) >= 30) redirect("/agent?error=Agent%20has%20reached%20the%20hourly%20run%20limit.%20Try%20again%20later.");

  const { data: connection } = await admin.from("ai_connections")
    .select("id, provider, model, base_url, encrypted_secret, secret_iv, status")
    .eq("id", parsed.data.connectionId).eq("user_id", auth.user.id).maybeSingle();
  if (!connection) redirect("/agent?error=The%20selected%20provider%20connection%20is%20not%20available.");
  if (connection.status !== "connected") redirect("/agent?error=Test%20the%20provider%20connection%20before%20using%20Agent.");

  let conversationId = parsed.data.conversationId;
  let focusOpportunityId = parsed.data.opportunityId || null;
  let conversationProjectId = auth.project.id;
  if (conversationId) {
    const { data: conversation } = await auth.supabase.from("agent_conversations")
      .select("id, project_id, opportunity_id").eq("id", conversationId).eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
    if (!conversation) redirect("/agent?error=That%20conversation%20is%20not%20available.");
    focusOpportunityId = conversation.opportunity_id;
    conversationProjectId = conversation.project_id;
  } else {
    if (focusOpportunityId) {
      const { data: opportunity } = await auth.supabase.from("opportunities").select("id, project_id").eq("id", focusOpportunityId).eq("user_id", auth.user.id).maybeSingle();
      if (!opportunity) redirect("/agent?error=The%20focused%20Opportunity%20is%20not%20available.");
      conversationProjectId = opportunity.project_id;
    }
    const { data: conversation, error } = await auth.supabase.from("agent_conversations").insert({
      user_id: auth.user.id,
      project_id: conversationProjectId,
      opportunity_id: focusOpportunityId,
      title: conversationTitle(parsed.data.message),
    }).select("id").single();
    if (error || !conversation) redirect("/agent?error=The%20conversation%20could%20not%20be%20started.");
    conversationId = conversation.id;
  }

  const { error: userMessageError } = await auth.supabase.from("agent_messages").insert({
    user_id: auth.user.id,
    project_id: conversationProjectId,
    conversation_id: conversationId,
    role: "user",
    content: parsed.data.message,
  });
  if (userMessageError) redirect(`/agent?conversation=${conversationId}&error=Your%20message%20could%20not%20be%20saved.`);

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
  if (runError || !run) redirect(`/agent?conversation=${conversationId}&error=Agent%20could%20not%20start%20this%20run.`);

  try {
    const [profileResult, preferencesResult, opportunitiesResult, tasksResult, jobsResult, interviewsResult, contactsResult, documentsResult, historyResult, guidanceResult] = await Promise.all([
      auth.supabase.from("profiles").select("full_name, headline, summary").eq("user_id", auth.user.id).maybeSingle(),
      auth.supabase.from("career_preferences").select("target_titles, preferred_technologies, allowed_locations, remote_preference, minimum_compensation, currency, excluded_criteria").eq("user_id", auth.user.id).maybeSingle(),
      auth.supabase.from("opportunities").select("id, project_id, reference_number, stage, priority, next_action, next_action_due_at, updated_at, jobs(company, title, description, location, compensation, remote_policy)").eq("user_id", auth.user.id).neq("stage", "closed").order("updated_at", { ascending: false }).limit(100),
      auth.supabase.from("tasks").select("id, project_id, opportunity_id, title, status, priority, due_at").eq("user_id", auth.user.id).neq("status", "cancelled").order("due_at", { ascending: true, nullsFirst: false }).limit(100),
      auth.supabase.from("jobs").select("id, project_id, company, title, location, inbox_state, inbox_review_at, imported_at").eq("user_id", auth.user.id).neq("inbox_state", "tracked").order("imported_at", { ascending: false }).limit(60),
      auth.supabase.from("interviews").select("id, project_id, opportunity_id, interview_type, starts_at, status, interviewers").eq("user_id", auth.user.id).order("starts_at", { ascending: true }).limit(60),
      auth.supabase.from("contacts").select("id, project_id, opportunity_id, name, role, company, relationship, follow_up_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(60),
      auth.supabase.from("documents").select("id, project_id, opportunity_id, title, kind, status, updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(60),
      auth.supabase.from("agent_messages").select("role, content, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(12),
      auth.supabase.from("agent_preferences").select("guidance").eq("user_id", auth.user.id).maybeSingle(),
    ]);

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

    await admin.from("ai_runs").update({ status: "generating" }).eq("id", run.id).eq("user_id", auth.user.id);
    const history = (historyResult.data ?? []).reverse().map((message) => ({ role: message.role, content: message.content.slice(0, 6000) }));
    const contextPayload = {
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
    const result = await generateAgentResponse({ provider: connection.provider as AiProviderKind, model: connection.model, base_url: connection.base_url }, apiKey, prompt);

    const validProposals = result.output.proposals.flatMap((proposal) => {
      const checked = agentProposalSchema.safeParse(proposal);
      if (!checked.success) return [];
      if (checked.data.targetId && !opportunities.some((opportunity) => opportunity.id === checked.data.targetId)) return [];
      return [checked.data];
    });
    const finalStatus = validProposals.length ? "awaiting_approval" : "completed";
    await admin.from("ai_runs").update({ status: finalStatus, output: result.output, input_tokens: result.inputTokens ?? null, output_tokens: result.outputTokens ?? null }).eq("id", run.id).eq("user_id", auth.user.id);
    await admin.from("agent_messages").insert({
      user_id: auth.user.id,
      project_id: conversationProjectId,
      conversation_id: conversationId,
      run_id: run.id,
      role: "agent",
      content: result.output.message,
    });
    await admin.from("agent_run_steps").insert([
      { user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id, label: "Read account and Workspace context", status: "completed", position: 1 },
      { user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id, label: `Used ${connection.model}`, status: "completed", position: 2 },
      { user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id, label: validProposals.length ? "Prepared reviewable changes" : "Prepared grounded answer", status: "completed", position: 3 },
    ]);
    if (validProposals.length) {
      await admin.from("agent_proposals").insert(validProposals.map((proposal) => ({
        user_id: auth.user.id,
        project_id: conversationProjectId,
        conversation_id: conversationId,
        run_id: run.id,
        tool_name: proposal.tool,
        target_type: proposal.tool === "create_workspace" ? "account" : "opportunity",
        target_id: proposal.targetId,
        summary: proposal.summary,
        arguments: proposal,
      })));
    }
    await auth.supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", auth.user.id);
  } catch (error) {
    const code = error instanceof z.ZodError ? "invalid_provider_output" : "provider_request_failed";
    await admin.from("ai_runs").update({ status: "failed", error_message: "Agent could not complete this run." }).eq("id", run.id).eq("user_id", auth.user.id);
    await admin.from("agent_run_steps").insert({ user_id: auth.user.id, project_id: conversationProjectId, conversation_id: conversationId, run_id: run.id, label: "Agent run failed safely", status: "failed", position: 1 });
    await recordSystemEvent({ category: "ai", code, userId: auth.user.id, metadata: { provider: connection.provider, model: connection.model } });
    revalidatePath("/agent");
    redirect(`/agent?conversation=${conversationId}&error=Agent%20could%20not%20complete%20that%20request.%20Your%20message%20is%20saved;%20try%20again.`);
  }

  revalidatePath("/agent");
  redirect(`/agent?conversation=${conversationId}`);
}

export async function decideAgentProposal(formData: FormData) {
  const parsed = proposalDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const auth = await authenticated();
  const admin = createAdminClient();
  const { data: proposal } = await admin.from("agent_proposals").select("*")
    .eq("id", parsed.data.proposalId).eq("user_id", auth.user.id).eq("status", "proposed").maybeSingle();
  if (!proposal) redirect("/agent?error=That%20Agent%20proposal%20is%20no%20longer%20available.");
  const conversationHref = `/agent?conversation=${proposal.conversation_id}`;

  if (parsed.data.decision === "reject") {
    await admin.from("agent_proposals").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", proposal.id).eq("status", "proposed");
    revalidatePath("/agent");
    redirect(`${conversationHref}&decision=rejected`);
  }

  const claimed = await admin.from("agent_proposals").update({ status: "applying", decided_at: new Date().toISOString() })
    .eq("id", proposal.id).eq("status", "proposed").select("id").maybeSingle();
  if (!claimed.data) redirect(`${conversationHref}&error=That%20proposal%20was%20already%20decided.`);
  const argumentResult = agentProposalSchema.safeParse(proposal.arguments);
  if (!argumentResult.success) {
    await admin.from("agent_proposals").update({ status: "failed", error_code: "invalid_arguments" }).eq("id", proposal.id);
    redirect(`${conversationHref}&error=The%20proposal%20could%20not%20be%20validated.`);
  }

  const tool = argumentResult.data;
  let appliedRecordId: string | null = null;
  try {
    if (tool.tool === "create_workspace") {
      const { data, error } = await auth.supabase.from("search_projects").insert({
        user_id: auth.user.id,
        name: tool.name!,
        objective: tool.objective || "Run a focused search for the right next role",
      }).select("id").single();
      if (error || !data) throw new Error("workspace_insert_failed");
      appliedRecordId = data.id;
    } else {
      const { data: opportunity } = await auth.supabase.from("opportunities").select("id, project_id").eq("id", tool.targetId!).eq("user_id", auth.user.id).maybeSingle();
      if (!opportunity) throw new Error("opportunity_scope_failed");
      if (tool.tool === "create_task") {
        const { data, error } = await auth.supabase.from("tasks").insert({ user_id: auth.user.id, project_id: opportunity.project_id, opportunity_id: tool.targetId, title: tool.title!, category: "admin", status: "todo", priority: "normal", due_at: tool.dueAt, created_by: "agent" }).select("id").single();
        if (error || !data) throw new Error("task_insert_failed");
        appliedRecordId = data.id;
      } else if (tool.tool === "set_next_action") {
        const { error } = await auth.supabase.from("opportunities").update({ next_action: tool.title!, next_action_due_at: tool.dueAt }).eq("id", tool.targetId!).eq("user_id", auth.user.id).eq("project_id", opportunity.project_id);
        if (error) throw new Error("next_action_update_failed");
        appliedRecordId = tool.targetId;
      } else if (tool.tool === "create_note") {
        const { data, error } = await auth.supabase.from("opportunity_notes").insert({ user_id: auth.user.id, opportunity_id: tool.targetId!, body: tool.body! }).select("id").single();
        if (error || !data) throw new Error("note_insert_failed");
        appliedRecordId = data.id;
      }
      await auth.supabase.from("opportunity_events").insert({ user_id: auth.user.id, opportunity_id: tool.targetId!, actor: "agent", event_type: "agent_proposal_applied", payload: { proposal_id: proposal.id, tool: tool.tool } });
    }
    await admin.from("agent_proposals").update({ status: "applied", applied_at: new Date().toISOString(), error_code: null }).eq("id", proposal.id).eq("status", "applying");
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 80) : "tool_application_failed";
    await admin.from("agent_proposals").update({ status: "failed", error_code: errorCode }).eq("id", proposal.id).eq("status", "applying");
    await recordSystemEvent({ category: "ai", code: "agent_tool_failed", userId: auth.user.id, metadata: { tool: proposal.tool_name, errorCode } });
    revalidatePath("/agent");
    redirect(`${conversationHref}&error=The%20approved%20change%20could%20not%20be%20applied.%20Review%20the%20target%20and%20try%20again.`);
  }

  revalidatePath("/agent");
  revalidatePath("/home");
  revalidatePath("/opportunities");
  if (proposal.target_id) revalidatePath(`/opportunities/${proposal.target_id}`);
  revalidatePath("/settings/workspaces");
  redirect(`${conversationHref}&decision=applied&record=${appliedRecordId ?? ""}`);
}

export async function archiveAgentConversation(formData: FormData) {
  const conversationId = z.string().uuid().safeParse(formData.get("conversationId"));
  if (!conversationId.success) return;
  const auth = await authenticated();
  await auth.supabase.from("agent_conversations").update({ status: "archived" }).eq("id", conversationId.data).eq("user_id", auth.user.id);
  revalidatePath("/agent");
  redirect("/agent");
}
