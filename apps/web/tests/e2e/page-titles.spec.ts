import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test.use({ trace: "off", screenshot: "off" });

test("public pages retain descriptive titles through navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Roleway — A focused workspace for your job search");
  await page.goto("/privacy");
  await expect(page).toHaveTitle("Privacy · Roleway");
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveTitle("Roleway — A focused workspace for your job search");
  for (const [path, title] of [
    ["/login", "Log in"],
    ["/signup", "Create an account"],
    ["/forgot-password", "Reset password"],
    ["/reset-password", "Choose a new password"],
    ["/verify-email", "Verify your email"],
    ["/help", "Help Center"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} · Roleway`);
  }
  const article = page.locator('a[href^="/help/"]').first();
  if (await article.count()) {
    await article.click();
    await expect(page.locator(".help-article h1")).toBeVisible();
    const heading = await page.locator(".help-article h1").textContent();
    await expect(page).toHaveTitle(`${heading} · Help Center · Roleway`);
  }
});

test("workspace and settings pages have distinct browser titles on desktop and mobile", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-titles-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    await page.goto("/onboarding");
    await expect(page).toHaveTitle("Set up your workspace · Roleway");
    const { error } = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId);
    if (error) throw error;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, title] of [
        ["/home", "Home"], ["/inbox", "Inbox"], ["/opportunities", "Opportunities"],
        ["/interview", "Interviews"], ["/documents", "Documents"], ["/contacts", "Contacts"],
        ["/notifications", "Notifications"], ["/insights", "Insights"], ["/agent", "Agent"],
        ["/settings/profile", "Profile · Settings"], ["/settings/appearance", "Appearance · Settings"],
        ["/settings/notifications", "Notifications · Settings"], ["/settings/ai", "Agent · Settings"],
        ["/settings/billing", "Plan & billing · Settings"], ["/settings/privacy", "Privacy & data · Settings"],
        ["/settings/workspaces", "Workspaces · Settings"], ["/today", "Home"],
        ["/settings", "Profile · Settings"],
      ]) {
        await page.goto(path);
        await expect(page).toHaveTitle(`${title} · Roleway`);
      }
    }
    // A normal user must receive the destination title when denied admin access.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/home/);
    await expect(page).toHaveTitle("Home · Roleway");
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
