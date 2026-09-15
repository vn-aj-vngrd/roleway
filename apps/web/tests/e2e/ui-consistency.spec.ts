import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`auth controls and recovery feedback at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("roleway-theme", value),
        theme,
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of [
        "login",
        "signup",
        "forgot-password",
        "verify-email",
        "reset-password",
      ]) {
        await page.goto(
          `/${route}?error=Please%20check%20your%20details%20and%20try%20again.`,
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        for (const button of await page
          .locator('form [data-slot="button"]')
          .all()) {
          const geometry = await button.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              radius: parseFloat(style.borderTopLeftRadius),
              height: element.getBoundingClientRect().height,
            };
          });
          expect(geometry.radius).toBeGreaterThanOrEqual(geometry.height / 2);
          expect(geometry.height).toBeGreaterThanOrEqual(44);
        }
        await expect(page.getByRole("alert").first()).toContainText(
          "Please check your details",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations.map(({ id, nodes }) => ({
            id,
            targets: nodes.map((node) => node.target),
          })),
        ).toEqual([]);
        await page.screenshot({
          animations: "disabled",
          path: `/tmp/roleway-${route}-${width}-${theme}.png`,
        });
      }
      await page.goto("/forgot-password?sent=1");
      await expect(page.getByRole("status")).toContainText("Check your email");
      await expect(
        page.getByRole("button", { name: "Send recovery link" }),
      ).toHaveCount(0);
      await page.getByRole("link", { name: "Return to login" }).click();
      await expect(page).toHaveURL(/\/login$/);
      expect(errors).toEqual([]);
    });
  }
}

test("onboarding keeps fields, progress, and recovery consistent across themes", async ({
  page,
}) => {
  const { createClient } = await import("@supabase/supabase-js");
  const { createFixtureAccount } = await import("./auth-fixture");
  const { randomBytes } = await import("node:crypto");
  const email = `e2e-ui-${Date.now()}@roleway.test`;
  const password = `Rw!${randomBytes(12).toString("hex")}`;
  const userId = await createFixtureAccount(email, password, page);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  try {
    await page.goto("/onboarding");
    await page.getByLabel("Full name", { exact: true }).fill("UI Review");
    await page.getByLabel("Professional headline").fill("Product Engineer");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["Light", "Dark"]) {
        await page.getByRole("button", { name: theme, exact: true }).click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme.toLowerCase(),
        );
        await page.locator("input").evaluateAll(async (inputs) => {
          await Promise.all(
            inputs.flatMap((input) =>
              input
                .getAnimations()
                .map((animation) => animation.finished.catch(() => {})),
            ),
          );
        });
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          audit.violations.map(({ id, nodes }) => ({
            id,
            nodes: nodes.map(({ target, failureSummary }) => ({
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
          animations: "disabled",
          path: `/tmp/roleway-onboarding-${width}-${theme.toLowerCase()}.png`,
        });
      }
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Create your first Workspace." }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Back", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Start with the direction you are taking.",
      }),
    ).toBeFocused();
    await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
      "UI Review",
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("Target role", { exact: true })
      .fill("Product Engineer");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "One system from discovery to outcome.",
      }),
    ).toBeFocused();
    await page.screenshot({
      animations: "disabled",
      path: "/tmp/roleway-onboarding-ready-mobile.png",
    });
    await page
      .getByRole("button", { name: "Create Workspace and start tour" })
      .click();
    await expect(page).toHaveURL(/\/home/);
  } finally {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`landing accent text has accessible contrast in ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("roleway-theme", value),
      theme,
    );
    await page.goto("/");
    await expect(page.locator(".rw-site")).toBeVisible();
    await page.locator(".rw-site").evaluate(async (site) => {
      await Promise.all(
        site
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const result = await new AxeBuilder({ page })
      .include(".rw-next-slip")
      .include(".rw-highlight-copy")
      .include(".art-job-tag")
      .include(".art-workspace aside")
      .include(".rw-assist-preview")
      .withRules(["color-contrast"])
      .analyze();
    expect(
      result.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}
