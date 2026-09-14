import { expect, test } from "@playwright/test";

for (const timezoneId of ["UTC", "Asia/Manila"]) {
  test.describe(`pipeline hydration in ${timezoneId}`, () => {
    test.use({ timezoneId, locale: "en-US" });
    test("hydrates without errors and shows browser-local due dates", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      const appearance = page.getByRole("group", { name: "Appearance", exact: true });
      await appearance.getByRole("button", { name: "Dark", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const expected = timezoneId === "UTC" ? "Due Sep 4" : "Due Sep 5";
      await expect(page.locator(".landing-workspace-preview").getByText(expected, { exact: true }).first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
