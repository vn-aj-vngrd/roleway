import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`signup password confirmation at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("roleway-theme", value),
        theme,
      );
      // Local interaction fixture only; real provider validation is tested separately.
      await page.route(
        "https://challenges.cloudflare.com/turnstile/v0/api.js**",
        (route) =>
          route.fulfill({
            contentType: "application/javascript",
            body: 'window.turnstile = { render(element, options) { options.callback("fixture-token-not-valid-with-provider"); return "fixture-widget"; }, remove() {} };',
          }),
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/signup");
      await page
        .getByLabel("Email", { exact: true })
        .fill("preview@example.com");
      const password = page.getByLabel("Password", { exact: true });
      const confirmation = page.getByLabel("Confirm password", { exact: true });
      await expect(confirmation).toHaveAttribute(
        "autocomplete",
        "new-password",
      );
      await password.fill("short");
      expect(
        await password.evaluate(
          (input: HTMLInputElement) => input.validity.tooShort,
        ),
      ).toBe(true);
      await password.fill("meadow lantern orbit river");
      await expect(page.getByLabel("Password length guidance")).toContainText(
        "16+ characters recommended: met",
      );
      await confirmation.fill("different password");
      await page.getByRole("button", { name: "Show passwords" }).click();
      await expect(password).toHaveAttribute("type", "text");
      await expect(confirmation).toHaveAttribute("type", "text");
      await expect(confirmation).toHaveAttribute("aria-invalid", "true");
      await expect(
        page.getByText(
          "Passwords don’t match. Enter the same password in both fields.",
        ),
      ).toBeVisible();
      let submissions = 0;
      page.on("request", (request) => {
        if (request.method() === "POST") submissions++;
      });
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await expect(confirmation).toBeFocused();
      expect(submissions).toBe(0);
      await confirmation.fill("meadow lantern orbit river");
      await expect(
        page.getByText("Passwords match.", { exact: true }),
      ).toBeVisible();
      await expect(confirmation).not.toHaveAttribute("aria-invalid", "true");
      await page.getByRole("button", { name: "Hide passwords" }).click();
      await expect(password).toHaveAttribute("type", "password");
      await expect(confirmation).toHaveAttribute("type", "password");
      await expect(confirmation).toHaveValue("meadow lantern orbit river");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target }) => target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: `/tmp/roleway-signup-${width}-${theme}.png`,
        fullPage: true,
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }
}
