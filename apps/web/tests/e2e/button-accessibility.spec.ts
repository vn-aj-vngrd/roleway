import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("primary links retain readable colors and keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.addInitScript((value) => localStorage.setItem("roleway-theme", value), theme);
      await page.goto("/");
      const start = page.getByRole("link", { name: "Start with Free", exact: true });
      const reference = page.getByRole("link", { name: "Create your workspace", exact: true }).first();
      await expect(start).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const referenceColors = await reference.evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, background: style.backgroundColor };
      });
      await expect.poll(() => start.evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, background: style.backgroundColor };
      })).toEqual(referenceColors);
      await start.scrollIntoViewIfNeeded();
      for (const state of ["rest", "hover", "focus"] as const) {
        if (state === "hover") await start.hover();
        if (state === "focus") {
          await page.mouse.move(0, 0);
          await start.focus();
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Tab");
          await expect(start).toBeFocused();
          expect(await start.evaluate((element) => {
            const style = getComputedStyle(element);
            return style.outlineStyle !== "none" || style.boxShadow !== "none";
          })).toBe(true);
        }
        const audit = await new AxeBuilder({ page }).include("#pricing").withTags(["wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(audit.violations).toEqual([]);
      }
      if (width === 390) expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `/tmp/roleway-button-${width}-${theme}.png` });
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/signup$/);
      const submit = page.getByRole("button", { name: "Create account", exact: true });
      await expect(submit).toBeVisible();
      // Native submit buttons and button-styled links share the same action tokens.
      expect(await submit.evaluate((element) => getComputedStyle(element).color)).toBe(referenceColors.color);
    }
  }
  expect(errors).toEqual([]);
});
