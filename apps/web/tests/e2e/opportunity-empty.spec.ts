import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Opportunity empty state points to capture or review as appropriate", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-empty-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.goto("/opportunities");
        await page.evaluate(theme => { localStorage.setItem("roleway-theme", theme); document.documentElement.dataset.theme = theme; }, theme);
        const empty = page.locator('[data-slot="empty"]');
        await expect(empty.getByRole("heading", { name: "No opportunities yet" })).toBeVisible();
        await empty.getByRole("button", { name: "Add a job" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/roleway-opportunity-empty-${theme}-${width}.png`, animations: "disabled" });
      }
    }
    const job = await admin.from("jobs").insert({ user_id: userId, project_id: profile.data.active_project_id, company: "Empty state fixture", title: "Engineer", inbox_state: "new" }).select("id").single();
    if (job.error) throw job.error;
    await page.reload();
    await page.locator('[data-slot="empty"]').getByRole("link", { name: "Review Inbox" }).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByText("Empty state fixture", { exact: true }).first()).toBeVisible();
    const deferred = await admin.from("jobs").update({ inbox_state: "maybe", inbox_review_at: "2099-01-01T00:00:00Z" }).eq("id", job.data.id);
    if (deferred.error) throw deferred.error;
    await page.goto("/opportunities");
    await expect(page.locator('[data-slot="empty"]').getByRole("button", { name: "Add a job" })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) throw error; }
  }
});
