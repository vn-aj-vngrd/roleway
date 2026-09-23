import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`auth alert status and alignment at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("roleway-theme", value),
        theme,
      );
      for (const [url, variant, role] of [
        ["/login?message=You%20have%20signed%20out.", "success", "status"],
        [
          "/login?error=Your%20session%20expired.%20Sign%20in%20again%20to%20continue.",
          "danger",
          "alert",
        ],
        ["/verify-email", "info", "status"],
      ]) {
        await page.goto(url);
        const alert = page.locator(
          `[data-slot="alert"][data-variant="${variant}"]`,
        );
        await expect(alert).toHaveAttribute("role", role);
        const delta = await alert.evaluate((element) => {
          const icon = element.querySelector("svg")!;
          const text = element.querySelector(
            '[data-slot="alert-description"]',
          )!;
          const iconRect = icon.getBoundingClientRect(),
            textRect = text.getBoundingClientRect();
          return Math.abs(
            iconRect.y +
              iconRect.height / 2 -
              textRect.y -
              parseFloat(getComputedStyle(text).lineHeight) / 2,
          );
        });
        expect(delta).toBeLessThan(1);
        const audit = await new AxeBuilder({ page })
          .include('[data-slot="alert"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          audit.violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.map(({ target, failureSummary }) => ({
              target,
              failureSummary,
            })),
          })),
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: `/tmp/roleway-alert-${variant}-${width}-${theme}.png`,
        });
      }
    });
  }
}
