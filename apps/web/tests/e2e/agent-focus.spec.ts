import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("saved focus survives closure, ignores URL overrides, and refreshes renamed Workspaces", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  try {
    userId = await createFixtureAccount(`e2e-focus-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    const ownership = { user_id: userId, project_id: profile.data.active_project_id };
    const connection = await admin.from("ai_connections").insert({ user_id: userId, provider: "openai", label: "Focus fixture", model: "fixture", encrypted_secret: "not-a-key", secret_iv: "fixture", key_hint: "fixture", status: "connected" });
    if (connection.error) throw connection.error;
    const job = await admin.from("jobs").insert({ ...ownership, company: "Closed focus company", title: "Engineer" }).select("id").single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({ ...ownership, job_id: job.data.id, stage: "closed", closed_reason: "withdrawn" }).select("id").single();
    if (opportunity.error) throw opportunity.error;
    const conversation = await admin.from("agent_conversations").insert({ ...ownership, title: "Saved focus", scope_mode: "workspace", opportunity_id: opportunity.data.id }).select("id").single();
    if (conversation.error) throw conversation.error;
    const unfocused = await admin.from("agent_conversations").insert({ ...ownership, title: "Workspace only", scope_mode: "workspace" }).select("id").single();
    if (unfocused.error) throw unfocused.error;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/agent?conversation=${conversation.data.id}`);
      await expect(page.locator(".agent-native-scope")).toContainText("Closed focus company");
      await expect(page.locator(".agent-native-scope")).toBeVisible();
      await expect(page.locator('input[name="opportunityId"]')).toHaveValue(opportunity.data.id);
      const focus = page.getByRole("button", { name: "Agent Opportunity focus", exact: true });
      await expect(focus).toBeDisabled();
      await expect(focus).toHaveAttribute("data-tooltip", /Closed focus company/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    // A URL cannot add an Opportunity focus to a saved Workspace-only conversation.
    const reopened = await admin.from("opportunities").update({ stage: "interested", closed_reason: null }).eq("id", opportunity.data.id);
    if (reopened.error) throw reopened.error;
    await page.goto(`/agent?conversation=${unfocused.data.id}&opportunity=${opportunity.data.id}`);
    await expect(page.locator('input[name="opportunityId"]')).toHaveValue("");
    await expect(page.locator(".agent-native-scope")).not.toContainText("Closed focus company");
    // Keep the account-layout session alive while a real Settings action revalidates it.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { document.documentElement.dataset.agentFocusTest = "same-session"; });
    await page.locator(".account-area > button").click();
    await page.getByRole("menuitem", { name: "Workspaces", exact: true }).click();
    await page.locator(`.workspace-directory-primary[href="/settings/workspaces/${ownership.project_id}"]`).click();
    await page.locator(`a[href="/settings/workspaces/${ownership.project_id}/general"]`).click();
    await page.getByLabel("Icon and name", { exact: true }).fill("Renamed focus workspace");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page).toHaveURL(/saved=true/);
    await page.getByRole("link", { name: "Back to app", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("complementary", { name: "Main navigation" }).getByRole("link", { name: "Agent", exact: true }).click();
    await expect(page.locator(".agent-native-scope")).toHaveText("Renamed focus workspace");
    await expect(page.locator(".workspace-breadcrumb")).toContainText("Renamed focus workspace");
    await expect(page.getByRole("button", { name: "Agent Opportunity focus", exact: true })).toHaveAttribute("data-tooltip", /Renamed focus workspace/);
    expect(await page.evaluate(() => document.documentElement.dataset.agentFocusTest)).toBe("same-session");
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
