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
    const connection = await admin.from("ai_connections").insert({ user_id: userId, provider: "openai", label: "UI fixture only", model: "fixture", encrypted_secret: "not-a-key", secret_iv: "fixture", key_hint: "fixture", status: "connected" });
    if (connection.error) throw connection.error;
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
    await expect(page.locator(".agent-message-timestamp")).toContainText("Today");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy message", exact: true }).click();
    await expect(page.getByText("Message copied", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Review this proposed Next Action.");
    const input = page.getByLabel("Message Roleway Agent", { exact: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) {
        for (const name of ["Show Agent actions", "Show slash commands"]) {
          const bounds = await page.getByRole("button", { name, exact: true }).boundingBox();
          expect(bounds!.width).toBeGreaterThanOrEqual(44);
          expect(bounds!.height).toBeGreaterThanOrEqual(44);
        }
      }
      await page.getByRole("button", { name: "Show Agent actions", exact: true }).click();
      await expect(page.getByRole("listbox", { name: "Agent actions" })).toBeVisible();
      await expect(page.getByRole("listbox", { name: "Agent actions" }).getByRole("option")).toHaveCount(13);
      await expect(page.locator(".agent-capability-popover")).toHaveCSS("transform", "none");
      const panel = await page.locator(".agent-capability-popover").boundingBox();
      const composer = await page.locator(".agent-native-composer").boundingBox();
      expect(Math.abs(panel!.width - composer!.width)).toBeLessThanOrEqual(2);
      expect(panel!.y + panel!.height).toBeLessThan(composer!.y);
      await page.screenshot({ path: `/tmp/roleway-agent-${width}.png`, animations: "disabled" });
      await input.press("Escape");
      await expect(page.getByRole("listbox", { name: "Agent actions" })).toBeHidden();
      await page.getByRole("button", { name: "Show slash commands", exact: true }).click();
      await expect(page.getByRole("listbox", { name: "Agent actions" }).getByRole("option")).toHaveCount(13);
      await input.fill("/create task");
      await expect(page.getByRole("listbox", { name: "Agent actions" }).getByRole("option")).toHaveCount(1);
      await input.press("Enter");
      await expect(input).toHaveValue(/Help me create a task/);
      await expect(page.getByRole("listbox", { name: "Agent actions" })).toBeHidden();
      await input.fill("");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.evaluate(() => { localStorage.setItem("roleway-theme", "dark"); });
    await page.reload();
    await page.getByRole("button", { name: "Show Agent actions", exact: true }).click();
    await page.screenshot({ path: "/tmp/roleway-agent-390-dark.png", animations: "disabled" });
    await page.getByLabel("Message Roleway Agent", { exact: true }).press("Escape");
    await page.getByRole("button", { name: "Approve change", exact: true }).click();
    await expect(page.getByText("expired", { exact: true })).toBeVisible();
    await expect(page.locator(".agent-inline-state[role=status]")).toContainText("ask Agent for a fresh proposal");
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


test("all four Create actions save once, show progress and open their results", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-create-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    const ownership = { user_id: userId, project_id: profile.data.active_project_id };
    const job = await admin.from("jobs").insert({ ...ownership, company: "Create fixture", title: "Engineer" }).select("id").single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({ ...ownership, job_id: job.data.id, stage: "interested", next_action: null }).select("id").single();
    if (opportunity.error) throw opportunity.error;
    const conversation = await admin.from("agent_conversations").insert({ ...ownership, title: "All creation flows" }).select("id").single();
    if (conversation.error) throw conversation.error;
    const cases = [
      { tool: "create_workspace", pending: "Creating Workspace…", success: "Workspace created", open: "Open Workspace" },
      { tool: "create_task", pending: "Creating task…", success: "Task created", open: "Open task" },
      { tool: "create_note", pending: "Creating note…", success: "Note created", open: "Open note" },
      { tool: "set_next_action", pending: "Setting Next Action…", success: "Next Action saved", open: "Open Next Action" },
    ];
    let newWorkspaceId = "";
    for (const [index, entry] of cases.entries()) {
      const run = await admin.from("ai_runs").insert({ ...ownership, conversation_id: conversation.data.id, task_type: "conversation", provider: "openai", model: "fixture", status: "generating" }).select("id").single();
      if (run.error) throw run.error;
      const completion = await admin.rpc("complete_agent_run", { input_run_id: run.data.id, input_tokens: null, output_tokens: null, input_output: {
        message: `Ready to ${entry.tool}.`, proposals: [{ tool: entry.tool, targetId: entry.tool === "create_workspace" ? null : opportunity.data.id, summary: `Creation fixture ${index}`, title: "Prepare examples", dueAt: null, body: "Recruiter prefers TypeScript examples.", name: "Created search", objective: "Find a TypeScript role", expectedNextAction: { title: null, dueAt: null } }],
      } });
      if (completion.error) throw completion.error;
      // Keep another Workspace active to exercise opening cross-Workspace results.
      if (newWorkspaceId) await admin.from("profiles").update({ active_project_id: newWorkspaceId }).eq("user_id", userId);
      await page.setViewportSize({ width: index % 2 ? 390 : 1440, height: 900 });
      await page.goto(`/agent?conversation=${conversation.data.id}`);
      const card = page.getByRole("region", { name: "Agent proposed change" }).filter({ hasText: `Creation fixture ${index}` });
      let release: () => void = () => {};
      const held = new Promise<void>(resolve => { release = resolve; });
      await page.route("**/agent?**", async route => {
        if (route.request().method() === "POST") await held;
        await route.continue();
      });
      await card.getByRole("button", { name: "Approve change", exact: true }).click();
      try {
        await expect(card.getByRole("button", { name: entry.pending })).toBeDisabled();
      } finally { release(); }
      if (entry.tool === "create_workspace") {
        await expect(page.locator(".agent-inline-state[role=alert]")).toContainText("active Workspace limit is reached");
        await expect(card.getByRole("link", { name: "Open Workspace", exact: true })).toHaveCount(0);
        const plan = await admin.from("account_plans").upsert({ user_id: userId, plan_slug: "plus", expires_at: new Date(Date.now() + 86400000).toISOString() });
        if (plan.error) throw plan.error;
        await card.getByRole("button", { name: "Approve change", exact: true }).click();
      }
      await expect(card.getByText(entry.success, { exact: true })).toBeVisible();
      await page.unroute("**/agent?**");
      await page.reload();
      await expect(card.getByText(entry.success, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await expect(card).toBeInViewport();
      const openControl = entry.tool === "create_workspace" ? card.getByRole("link", { name: entry.open, exact: true }) : card.getByRole("button", { name: entry.open, exact: true });
      await expect(openControl).toBeInViewport();
      await page.screenshot({ path: `/tmp/roleway-created-${entry.tool}.png`, animations: "disabled", caret: "initial" });
      if (entry.tool === "create_workspace") {
        const saved = await admin.from("search_projects").select("id").eq("user_id", userId).eq("name", "Created search");
        expect(saved.data).toHaveLength(1);
        newWorkspaceId = saved.data![0]!.id;
        await card.getByRole("link", { name: entry.open, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/settings/workspaces/${newWorkspaceId}$`));
      } else {
        await card.getByRole("button", { name: entry.open, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/opportunities/${opportunity.data.id}`));
        if (entry.tool === "create_task") {
          await expect(page.getByText("Prepare examples", { exact: true })).toBeVisible();
          const saved = await admin.from("tasks").select("id").eq("opportunity_id", opportunity.data.id).eq("created_by", "agent");
          expect(saved.data).toHaveLength(1);
        } else if (entry.tool === "create_note") {
          await expect(page.locator("#notes")).toContainText("Recruiter prefers TypeScript examples.");
          const saved = await admin.from("opportunity_notes").select("id").eq("opportunity_id", opportunity.data.id);
          expect(saved.data).toHaveLength(1);
        } else {
          const saved = await admin.from("opportunities").select("next_action").eq("id", opportunity.data.id).single();
          expect(saved.data?.next_action).toBe("Prepare examples");
        }
      }
    }
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) throw cleanup.error;
    }
  }
});
