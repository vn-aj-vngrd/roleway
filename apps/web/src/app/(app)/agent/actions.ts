"use server";

import { capacityError } from "@/features/billing/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentProposalSchema } from "@roleway/schemas";
import { z } from "zod";
import { runAgentRequest } from "@/features/agent/run-request";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSystemEvent } from "@/lib/observability";

const proposalDecisionSchema = z.object({ proposalId: z.string().uuid(), decision: z.enum(["approve", "reject"]) });

async function authenticated() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  return { ...context, project: context.project };
}

export async function sendAgentMessage(formData: FormData) {
  redirect(await runAgentRequest(formData));
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

  const argumentResult = agentProposalSchema.safeParse(proposal.arguments);
  if (parsed.data.decision === "approve" && !argumentResult.success) {
    redirect(`${conversationHref}&error=The%20proposal%20could%20not%20be%20validated.`);
  }
  const { data: appliedRecordId, error } = await auth.supabase.rpc("decide_agent_proposal", {
    input_proposal_id: proposal.id,
    input_decision: parsed.data.decision,
  });
  if (error) {
    await recordSystemEvent({ category: "ai", code: "agent_tool_failed", userId: auth.user.id, metadata: { tool: proposal.tool_name } });
    const duplicateMessage = error.message?.includes("A matching contact already exists") ? "A matching contact already exists in this Workspace. Open Contacts to review it, or reject this proposal and clarify the person’s details." : error.message?.includes("A matching interview already exists") ? "A matching interview already exists. Open Interviews to review it, or reject this proposal and clarify the schedule." : null;
    const message = duplicateMessage ?? capacityError(error, "The change could not be applied. Nothing was changed; review the target and retry.");
    redirect(`${conversationHref}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/agent");
  revalidatePath("/home");
  revalidatePath("/interview");
  revalidatePath("/contacts");
  revalidatePath("/notifications");
  revalidatePath("/opportunities");
  if (proposal.target_id) revalidatePath(`/opportunities/${proposal.target_id}`);
  revalidatePath("/settings/workspaces");
  redirect(`${conversationHref}&decision=${parsed.data.decision === "reject" ? "rejected" : appliedRecordId ? "applied" : "unchanged"}&record=${appliedRecordId ?? ""}&proposal=${proposal.id}#proposal-${proposal.id}`);
}

export async function archiveAgentConversation(formData: FormData) {
  const conversationId = z.string().uuid().safeParse(formData.get("conversationId"));
  if (!conversationId.success) return;
  const auth = await authenticated();
  await auth.supabase.from("agent_conversations").update({ status: "archived" }).eq("id", conversationId.data).eq("user_id", auth.user.id);
  revalidatePath("/agent");
  redirect("/agent");
}

/** Open only an applied, owned proposal and switch to its verified destination. */
export async function openAgentResult(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("proposalId"));
  const auth = await authenticated();
  if (!id.success) redirect("/agent?error=That%20result%20is%20unavailable.");
  const { data: proposal } = await auth.supabase.from("agent_proposals")
    .select("conversation_id, tool_name, target_id, destination_project_id, applied_record_id")
    .eq("id", id.data).eq("user_id", auth.user.id).eq("status", "applied").maybeSingle();
  if (proposal && ["create_interview", "create_contact"].includes(proposal.tool_name)) {
    const failure = `/agent?conversation=${proposal.conversation_id}&error=The%20result%20is%20no%20longer%20available.`;
    if (!proposal.applied_record_id || !proposal.destination_project_id) redirect(failure);
    const { data: record } = await auth.supabase.from(proposal.tool_name === "create_interview" ? "interviews" : "contacts").select("id")
      .eq("id", proposal.applied_record_id).eq("user_id", auth.user.id).eq("project_id", proposal.destination_project_id).maybeSingle();
    if (!record) redirect(failure);
    const { error } = await auth.supabase.rpc("set_active_search_project", { input_project_id: proposal.destination_project_id });
    if (error) redirect(failure);
    revalidatePath("/", "layout");
    redirect(proposal.tool_name === "create_interview" ? `/interview/${record.id}` : `/contacts?edit=${record.id}`);
  }
  if (!proposal?.target_id || !proposal.destination_project_id) redirect("/agent?error=That%20result%20is%20unavailable.");
  const { data: target } = await auth.supabase.from("opportunities").select("id")
    .eq("id", proposal.target_id).eq("project_id", proposal.destination_project_id).eq("user_id", auth.user.id).maybeSingle();
  const failureHref = `/agent?conversation=${proposal.conversation_id}&error=The%20result%20is%20no%20longer%20available.`;
  if (!target) redirect(failureHref);
  const { error } = await auth.supabase.rpc("set_active_search_project", { input_project_id: proposal.destination_project_id });
  if (error) redirect(failureHref);
  revalidatePath("/", "layout");
  const section = proposal.tool_name === "create_task" ? "?tab=tasks" : proposal.tool_name === "create_note" ? "?tab=activity#notes" : "#next-action";
  redirect(`/opportunities/${target.id}${section}`);
}
