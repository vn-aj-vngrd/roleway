import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`Agent samples animate, pause and respect reduced motion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await page
      .getByRole("link", { name: "Meet Agent · your AI job-search assistant" })
      .click();
    const demo = page.getByRole("figure", {
      name: "Agent sample conversation",
    });
    // Finish the hero anchor scroll before testing viewport-gated playback.
    await demo.evaluate((element) =>
      element.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    const messages = demo.locator(".rw-agent-demo-message");
    await demo.getByRole("button", { name: "Next steps", exact: true }).click();
    await expect(
      demo.getByRole("button", { name: "Pause sample" }),
    ).toBeVisible();
    await demo.getByRole("button", { name: "Pause sample" }).click();
    const pausedCount = await messages.count();
    await page.waitForTimeout(2000);
    await expect(messages).toHaveCount(pausedCount);
    await demo.getByRole("button", { name: "Resume sample" }).click();
    await demo.evaluate((element) =>
      element.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    await expect(messages).toHaveCount(4);
    await expect(
      demo.getByRole("button", { name: "Replay sample" }),
    ).toBeFocused();
    await expect(
      demo.getByText("We can shape your answer together.", { exact: false }),
    ).toBeVisible();
    await demo
      .getByRole("button", { name: "Create a Workspace", exact: true })
      .click();
    await expect(
      demo.getByText("What would you like to call it?", { exact: true }),
    ).toBeVisible();
    await expect(messages).toHaveCount(6);
    await expect(
      demo.getByText(
        "Approve the proposal in Agent to create your Workspace.",
        { exact: false },
      ),
    ).toBeVisible();
    await demo.getByRole("button", { name: "Replay sample" }).focus();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      demo.getByRole("button", {
        name: "Animation disabled for reduced motion",
      }),
    ).toBeFocused();
    await expect(
      demo.getByRole("button", {
        name: "Animation disabled for reduced motion",
      }),
    ).toBeDisabled();
    await expect(messages).toHaveCount(6);
    await expect(
      demo.getByRole("button", { name: "Create a Workspace", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const taskSample = demo.getByRole("button", {
      name: "Create a task",
      exact: true,
    });
    await taskSample.focus();
    await page.keyboard.press("Enter");
    await expect(taskSample).toHaveAttribute("aria-pressed", "true");
    await expect(messages).toHaveCount(4);
    await expect(
      demo.getByRole("button", { name: "Pause sample" }),
    ).toHaveCount(0);
    await expect(messages.first()).toHaveCSS("animation-name", "none");
    for (const control of await demo.getByRole("button").all()) {
      const bounds = await control.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    for (const theme of ["Light", "Dark"] as const) {
      await page
        .getByRole("group", { name: "Appearance", exact: true })
        .getByRole("button", { name: theme, exact: true })
        .click();
      await demo.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `/tmp/roleway-agent-${width}-${theme}.png`,
      });
    }
    await page.getByRole("link", { name: "Ask Agent", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(errors).toEqual([]);
  });
}
