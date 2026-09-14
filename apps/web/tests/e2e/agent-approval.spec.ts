import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("stale Next Action approval preserves manual edits and explains recovery", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-approval-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    const ownership = { user_id: userId, project_id: profile.data.active_project_id };
    const job = await admin.from("jobs").insert({ ...ownership, company: "Approval fixture", title: "Engineer" }).select("id").single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({ ...ownership, job_id: job.data.id, stage: "interested", next_action: "Original action" }).select("id").single();
    if (opportunity.error) throw opportunity.error;
    const conversation = await admin.from("agent_conversations").insert({ ...ownership, title: "Approval regression" }).select("id").single();
    if (conversation.error) throw conversation.error;
    const run = await admin.from("ai_runs").insert({ ...ownership, conversation_id: conversation.data.id, task_type: "conversation", provider: "openai", model: "fixture", status: "generating" }).select("id").single();
    if (run.error) throw run.error;
    const completion = await admin.rpc("complete_agent_run", { input_run_id: run.data.id, input_tokens: null, output_tokens: null, input_output: {
      message: "Review this proposed Next Action.", proposals: [{ tool: "set_next_action", targetId: opportunity.data.id, summary: "Replace the original action", title: "Proposed action", dueAt: null, body: null, name: null, objective: null, expectedNextAction: { title: "Original action", dueAt: null } }],
    } });
    if (completion.error) throw completion.error;
    const edit = await admin.from("opportunities").update({ next_action: "New manual action" }).eq("id", opportunity.data.id);
    if (edit.error) throw edit.error;
    await page.goto(`/agent?conversation=${conversation.data.id}`);
    await page.getByRole("button", { name: "Approve change", exact: true }).click();
    await expect(page.getByText("expired", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("ask Agent for a fresh proposal");
    const saved = await admin.from("opportunities").select("next_action").eq("id", opportunity.data.id).single();
    expect(saved.error).toBeNull();
    expect(saved.data?.next_action).toBe("New manual action");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) throw cleanup.error;
    }
  }
});
