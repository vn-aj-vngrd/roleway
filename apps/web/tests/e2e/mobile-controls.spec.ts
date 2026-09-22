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
      await expect(page.locator('.workspace-page-actions [data-slot="button"]')).toBeVisible();
      const reference = await page.locator('.workspace-page-actions [data-slot="button"]').evaluate(el => ({ height: el.getBoundingClientRect().height, background: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontSize }));
      expect(reference.height).toBe(32);
      for (const route of ["home", "interview", "contacts", "documents"]) {
        await page.goto(`/${route}`);
        const button = page.locator('.workspace-page-actions [data-slot="button"]');
        await expect(button).toBeVisible();
        const style = await button.evaluate(el => ({ height: el.getBoundingClientRect().height, background: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontSize }));
        expect(style).toEqual(reference);
        expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
        await page.screenshot({ path: `/tmp/roleway-${route}-${theme}-mobile.png`, animations: "disabled" });
        await button.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.locator(".create-modal-panel")).toHaveCSS("animation-name", "overlay-reveal");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(page.locator(".create-modal-panel")).toHaveCSS("animation-name", "none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto("/settings/billing");
        await expect(page.getByRole("heading", { name: "Choose your capacity" })).toBeVisible();
        await expect(page.getByRole("progressbar", { name: "Active Workspaces" })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 1440) {
          const tops = await page.locator(".plan-price").evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
          expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
        }
        await page.locator(".billing-content").screenshot({ path: `/tmp/roleway-billing-${theme}-${width}.png`, animations: "disabled" });
      }
      await page.goto("/notifications");
      const badge = page.locator(".notification-view-tabs .count-badge").first();
      await expect(badge).toBeVisible();
      for (const value of ["0", "9", "45", "128", "9999"]) {
        const geometry = await badge.evaluate((el, value) => {
          el.textContent = value;
          const range = document.createRange(); range.selectNodeContents(el);
          return { width: el.getBoundingClientRect().width, text: range.getBoundingClientRect().width, height: el.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth };
        }, value);
        expect(geometry.width - geometry.text).toBeGreaterThanOrEqual(9);
        expect(geometry.height).toBe(20);
        expect(geometry.overflow).toBe(false);
      }
      await page.locator(".notification-view-tabs").screenshot({ path: `/tmp/roleway-counts-${theme}.png`, animations: "disabled" });
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("roleway:toast", { detail: { title: "Connection verified", description: "Your provider is ready to use.", duration: 30_000 } })));
      const toast = page.locator(".app-toast").filter({ hasText: "Your provider is ready to use" });
      await expect(toast).toBeVisible();
      expect(await toast.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/roleway-toast-${theme}-mobile.png`, animations: "disabled" });
      await toast.getByRole("button", { name: "Dismiss Connection verified" }).click();
      await expect(toast).toHaveCount(0);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/home");
    const options = page.locator(".sidebar-search-project-more").first();
    await page.locator(".sidebar-search-project-create").hover();
    await expect(page.getByRole("tooltip", { name: "New workspace" })).toBeVisible();
    await options.hover();
    await expect(page.getByRole("tooltip", { name: "Workspace options" })).toBeVisible();
    await options.click();
    const menu = page.getByRole("menu", { name: /options$/ });
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return [rect.left + 12, rect.right - 12].every(x => el.contains(document.elementFromPoint(x, rect.top + 20)));
    })).toBe(true);
    await page.screenshot({ path: "/tmp/roleway-workspace-menu.png", animations: "disabled" });
    await menu.getByRole("button", { name: "Archive workspace" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await page.keyboard.press("Escape");
    for (const route of ["contacts", "documents", "interview", "notifications"]) {
      await page.goto(`/${route}`);
      const empty = page.locator(".empty-state").first();
      await expect(empty).toBeVisible();
      await expect(empty.locator(".empty-icon svg")).toHaveCSS("width", "46px");
      await expect(empty.getByRole("heading")).toBeVisible();
      await expect(empty.locator('[data-slot="empty-description"]')).toBeVisible();
      await empty.screenshot({ path: `/tmp/roleway-empty-${route}.png`, animations: "disabled" });
    }
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
