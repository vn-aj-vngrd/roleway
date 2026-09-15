import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("workspace structure stays neutral and header matches its canvas", async ({
  page,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    userId = await createFixtureAccount(
      `e2e-surfaces-${Date.now()}@roleway.test`,
      `Rw!${randomBytes(12).toString("hex")}`,
      page,
    );
    const profile = await admin
      .from("profiles")
      .update({ onboarding_completed: true, tour_completed: true })
      .eq("user_id", userId)
      .select("active_project_id")
      .single();
    if (profile.error) throw profile.error;
    const ownership = {
      user_id: userId,
      project_id: profile.data.active_project_id,
    };
    const job = await admin
      .from("jobs")
      .insert({
        ...ownership,
        company: "Surface review",
        title: "Product Engineer",
      })
      .select("id")
      .single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({
      ...ownership,
      job_id: job.data.id,
      stage: "interested",
      next_action: "Prepare for the conversation",
    });
    if (opportunity.error) throw opportunity.error;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.addInitScript(
          (value) => localStorage.setItem("roleway-theme", value),
          theme,
        );
        await page.goto("/opportunities");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page
          .getByRole("button", { name: "Display options", exact: true })
          .click();
        await page.getByRole("button", { name: "Board", exact: true }).click();
        await page.keyboard.press("Escape");
        await expect(page.locator(".board-column").first()).toBeVisible();
        const palette = await page.evaluate(() => {
          const context = document.createElement("canvas").getContext("2d")!;
          const rgb = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const selectors = [
            ".workspace-toolbar",
            ".main",
            ".board",
            ".board-column",
            ".sidebar",
          ];
          return selectors.map((selector) => ({
            selector,
            rgb: rgb(
              getComputedStyle(document.querySelector(selector)!)
                .backgroundColor,
            ),
          }));
        });
        const countContrast = await page
          .locator('.pill-tab[aria-selected="true"] .count-badge')
          .first()
          .evaluate((element) => {
            const style = getComputedStyle(element);
            const context = document.createElement("canvas").getContext("2d")!;
            const luminance = (color: string) => {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              const channels = [...context.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((value) => {
                  const channel = value / 255;
                  return channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4;
                });
              return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
            };
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            return (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05);
          });
        expect(countContrast).toBeGreaterThanOrEqual(4.5);
        expect(palette[0].rgb).toEqual(palette[1].rgb);
        for (const { rgb } of palette)
          expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThanOrEqual(1);
        if (width === 1440) {
          const navigation = page
            .locator(".sidebar .nav-link")
            .filter({ hasText: "Contacts" })
            .first();
          await navigation.hover();
          const hover = await navigation.evaluate((element) => {
            const context = document.createElement("canvas").getContext("2d")!;
            context.fillStyle = getComputedStyle(element).backgroundColor;
            context.fillRect(0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
          });
          expect(Math.max(...hover) - Math.min(...hover)).toBeLessThanOrEqual(
            1,
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: `/tmp/roleway-surfaces-${width}-${theme}.png`,
        });
      }
    }
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
  expect(errors).toEqual([]);
});
