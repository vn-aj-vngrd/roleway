import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Mobile collection actions, feedback, avatar and Agent loading stay compact", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-controls-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true, full_name: "Test Reviewer" }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    const ownership = { user_id: userId, project_id: profile.data.active_project_id };
    const job = await admin.from("jobs").insert({ ...ownership, company: "UI fixture", title: "Engineer" }).select("id").single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({ ...ownership, job_id: job.data.id, stage: "interested" });
    if (opportunity.error) throw opportunity.error;
    await page.setViewportSize({ width: 390, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.goto("/inbox");
      await page.evaluate(theme => { localStorage.setItem("roleway-theme", theme); document.documentElement.dataset.theme = theme; }, theme);
      const reference = await page.locator('.workspace-page-actions [data-slot="button"]').evaluate(el => ({ height: el.getBoundingClientRect().height, background: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontSize }));
      expect(reference.height).toBe(32);
      for (const route of ["interview", "contacts", "documents"]) {
        await page.goto(`/${route}`);
        const button = page.locator('.workspace-page-actions [data-slot="button"]');
        await expect(button).toBeVisible();
        const style = await button.evaluate(el => ({ height: el.getBoundingClientRect().height, background: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontSize }));
        expect(style).toEqual(reference);
        expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
        await page.screenshot({ path: `/tmp/roleway-${route}-${theme}-mobile.png`, animations: "disabled" });
        await button.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("roleway:toast", { detail: { title: "Connection verified", description: "Your provider is ready to use.", duration: 30_000 } })));
      const toast = page.locator(".app-toast").filter({ hasText: "Your provider is ready to use" });
      await expect(toast).toBeVisible();
      expect(await toast.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/roleway-toast-${theme}-mobile.png`, animations: "disabled" });
      await toast.getByRole("button", { name: "Dismiss Connection verified" }).click();
      await expect(toast).toHaveCount(0);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const avatar = page.locator(".sidebar > .account-area .avatar");
    await expect(avatar).toHaveCSS("width", "32px");
    await expect(avatar).toHaveCSS("padding", "7px");
    await page.locator(".sidebar > .account-area").screenshot({ path: "/tmp/roleway-account-spacing.png", animations: "disabled" });
    await page.goto("/agent");
    await expect(page.locator(".agent-native-page")).toBeVisible();
    // Inspect the real streamed route fallback using the app's loaded stylesheet.
    const html = await (await page.request.get("/agent")).text();
    const loading = await page.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return doc.querySelector(".skeleton-agent-empty")?.closest(".workspace-loading")?.outerHTML ?? "";
    }, html);
    expect(loading).toContain("skeleton-agent-empty");
    await page.locator(".agent-native-page").evaluate((el, html) => { el.outerHTML = html; }, loading);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const mark = await page.locator(".skeleton-agent-empty .agent-waypoint-watermark").boundingBox();
      const copy = await page.locator(".skeleton-agent-empty .agent-empty-copy").boundingBox();
      expect(copy!.y - (mark!.y + mark!.height)).toBeGreaterThanOrEqual(31);
      await page.screenshot({ path: `/tmp/roleway-agent-skeleton-${width}.png`, animations: "disabled" });
    }
    expect(errors).toEqual([]);
  } finally {
    if (userId) { const { error } = await admin.auth.admin.deleteUser(userId); if (error) throw error; }
  }
});
