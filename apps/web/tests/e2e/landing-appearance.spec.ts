import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test.describe(`landing appearance at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme: "dark" });

    test("retains explicit and system appearance across reloads", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      const appearance = page.getByRole("group", { name: "Appearance", exact: true });
      for (const preference of ["Dark", "Light", "System"] as const) {
        await appearance.getByRole("button", { name: preference, exact: true }).click();
        await page.reload();
        await expect(appearance.getByRole("button", { name: preference, exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("html")).toHaveAttribute("data-theme", preference === "Light" ? "light" : "dark");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(errors).toEqual([]);
    });

    test("preview frames keep their borders unclipped after reveal", async ({ page }) => {
      await page.goto("/");
      const frames = page.locator(".rw-product-proof-frame");
      await expect(frames).toHaveCount(9);
      for (const frame of await frames.all()) {
        await frame.scrollIntoViewIfNeeded();
        await expect(frame).toHaveCSS("opacity", "1");
        await expect(frame).toHaveCSS("clip-path", "none");
        await expect(frame).toHaveCSS("transform", "none");
        for (const side of ["top", "right", "bottom", "left"]) {
          await expect(frame).toHaveCSS(`border-${side}-width`, "1px");
          await expect(frame).toHaveCSS(`border-${side}-style`, "solid");
        }
      }
    });
  });
}

for (const preference of ["dark", "system"]) {
  test(`restores ${preference} when hydration loses the boot attribute`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript((value) => {
      localStorage.setItem("roleway-theme", value);
      // Model a root remount dropping the boot attribute before client effects run.
      const observer = new MutationObserver(() => {
        if (document.documentElement?.hasAttribute("data-theme")) {
          observer.disconnect();
          document.documentElement.removeAttribute("data-theme");
        }
      });
      observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-theme"] });
    }, preference);
    await page.goto("/");
    await page.getByRole("group", { name: "Appearance", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: preference === "dark" ? "Dark" : "System", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}
