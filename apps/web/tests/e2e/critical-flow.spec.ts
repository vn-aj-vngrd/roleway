import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const email = `e2e-${Date.now()}-${randomBytes(3).toString("hex")}@roleway.test`;
const password = `Rw!${randomBytes(12).toString("hex")}`;
let opportunityPath = "";
let userId = "";

test.describe.serial("critical product journey", () => {
  const adminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase E2E environment is not configured.");
    return createClient(url, key, { auth: { persistSession: false } });
  };

  test.beforeAll(async () => {
    const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  });

  test.afterAll(async () => {
    const admin = adminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test("public landing is keyboard and mobile friendly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Keep every application moving." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pipeline", exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("landing → login → onboarding → opportunity → logout protection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Keep every application moving." })).toBeVisible();
    const getStarted = page.locator('a[href="/login"]', { hasText: "Get started" }).first();
    await expect(getStarted).toHaveAttribute("href", "/login");
    await getStarted.click();
    await page.waitForURL("**/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/onboarding", { timeout: 20_000 });

    await page.getByLabel("Full name").fill("E2E User");
    await page.getByLabel("Professional headline").fill("Product Engineer");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Target roles").fill("Product Engineer, Full-Stack Engineer");
    await page.getByLabel("Preferred technologies").fill("TypeScript, React, PostgreSQL");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Open my workspace" }).click();
    await expect(page).toHaveURL(/\/today\?welcome=true/);

    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), E2E/ })).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-sidebar", "compact");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.goto("/settings/ai");
    await page.getByLabel("API key").fill("sk-test-roleway-1234");
    await page.getByRole("button", { name: "Save connection" }).click();
    await expect(page.getByText("AI connection saved.")).toBeVisible();
    await expect(page.getByText("••••1234")).toBeVisible();
    const { data: savedConnection } = await adminClient().from("ai_connections").select("encrypted_secret, key_hint").eq("user_id", userId).single();
    expect(savedConnection?.encrypted_secret).not.toContain("sk-test-roleway-1234");
    expect(savedConnection?.key_hint).toBe("••••1234");
    await page.getByRole("button", { name: "Delete Personal API" }).click();
    await expect(page.getByText("Connection removed.")).toBeVisible();
    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: "Connect a provider to begin" })).toBeVisible();
    await page.goto("/today");
    await page.getByRole("link", { name: "Add a job" }).first().click();

    await page.getByLabel("Company").fill("Example Company");
    await page.getByLabel("Role title").fill("Product Engineer");
    await page.getByLabel("Location").fill("Remote");
    await page.getByLabel("Job description").fill("Build dependable product workflows with TypeScript and PostgreSQL.");
    await page.getByRole("button", { name: "Save to inbox" }).click();
    await expect(page.getByText("Job added to your inbox.")).toBeVisible();
    await page.getByRole("button", { name: "Track opportunity" }).click();
    await expect(page).toHaveURL(/\/opportunities\/[0-9a-f-]+/);
    opportunityPath = new URL(page.url()).pathname;

    await page.getByPlaceholder("Add a task…").fill("Review requirements");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Review requirements", { exact: true })).toBeVisible();

    await page.getByLabel("Opportunity stage").selectOption("preparing");
    await page.getByRole("button", { name: "Update stage" }).click();
    await expect(page.getByLabel("Opportunity stage")).toHaveValue("preparing");

    await page.goto("/notifications");
    await expect(page.getByText("Opportunity moved to Preparing")).toBeVisible();
    await page.goto("/settings/notifications");
    await expect(page.getByRole("heading", { name: "Workspace notifications" })).toBeVisible();

    await page.goto("/settings/privacy");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download data export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^roleway-export-\d{4}-\d{2}-\d{2}\.json$/);

    await page.locator(".sidebar").getByRole("button", { name: /Open account menu/ }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login\?message=/);
    await page.goto(opportunityPath);
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(page.url()).toContain(encodeURIComponent(opportunityPath));
  });

  test("account deletion requires explicit confirmation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/today");
    await page.goto("/settings/privacy");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Delete account permanently" }).click();
    await expect(page).toHaveURL(/\/login\?message=/);
    await expect(page.getByText("Your Roleway account and workspace were deleted.")).toBeVisible();
  });
});
