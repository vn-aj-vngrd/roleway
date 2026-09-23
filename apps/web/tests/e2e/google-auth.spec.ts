import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip(
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true",
  "Enable the Google beta flag on the test server to exercise its UI.",
);
for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`Google beta entry at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("roleway-theme", value),
        theme,
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of ["login", "signup"]) {
        await page.goto(`/${route}`);
        const button = page.getByRole("button", {
          name: "Continue with Google Beta",
        });
        await expect(button).toBeEnabled();
        await expect(button.getByText("Beta", { exact: true })).toBeVisible();
        await button.focus();
        await expect(button).toBeFocused();
        const size = await button.evaluate((element) => ({
          height: element.getBoundingClientRect().height,
          radius: parseFloat(getComputedStyle(element).borderRadius),
        }));
        expect(size.height).toBeGreaterThanOrEqual(width === 390 ? 32 : 44);
        expect(size.radius).toBeGreaterThanOrEqual(size.height / 2);
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          audit.violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.map(({ target }) => target),
          })),
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: `/tmp/roleway-google-${route}-${width}-${theme}.png`,
          fullPage: true,
        });
      }
      await page.goto(
        "/auth/callback?provider=google&error=access_denied&error_description=private-provider-detail",
      );
      await expect(page).toHaveURL(/\/login\?/);
      await expect(page.getByRole("alert").first()).toContainText(
        "Google sign-in was canceled",
      );
      await expect(
        page.getByRole("button", { name: "Continue with Google Beta" }),
      ).toBeEnabled();
      expect(page.url()).not.toContain("private-provider-detail");
      expect(errors).toEqual([]);
    });
  }
}
