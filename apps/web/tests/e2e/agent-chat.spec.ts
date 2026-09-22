import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Agent formats Markdown and keeps composer controls usable across sizes and themes", async ({
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
      `e2e-chat-${Date.now()}@roleway.test`,
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
    const connection = await admin
      .from("ai_connections")
      .insert({
        user_id: userId,
        provider: "openai",
        label: "Chat fixture",
        model: "long-model-name-for-responsive-review",
        encrypted_secret: "fixture-not-a-key",
        secret_iv: "fixture",
        key_hint: "fixture",
        status: "connected",
      })
      .select("id")
      .single();
    if (connection.error) throw connection.error;
    const conversation = await admin
      .from("agent_conversations")
      .insert({ ...ownership, title: "Chat formatting with a long conversation title " + "detail".repeat(8) })
      .select("id")
      .single();
    if (conversation.error) throw conversation.error;
    const message =
      "## Your next steps\n\n**Prepare** these examples:\n\n- First\n  - Nested\n\n| Role | Action |\n| --- | --- |\n| Engineer | Prepare |\n\n```ts\nconst example = '" +
      "long".repeat(60) +
      "';\n```\n\n> Use your evidence.\n\n- [x] Reviewed\n- [ ] Draft\n\n[Guide](/help/agent-create)";
    const messages = await admin.from("agent_messages").insert([
      {
        ...ownership,
        conversation_id: conversation.data.id,
        role: "user",
        content: "hey",
      },
      {
        ...ownership,
        conversation_id: conversation.data.id,
        role: "agent",
        content: message,
      },
    ]);
    if (messages.error) throw messages.error;
    await page.goto(`/agent?conversation=${conversation.data.id}`);
    const input = page.getByLabel("Message Roleway Agent", { exact: true });
    await expect(
      page.getByRole("heading", { name: "Your next steps" }),
    ).toBeVisible();
    await expect(page.locator(".agent-markdown strong")).toHaveText("Prepare");
    await expect(page.locator(".agent-markdown table")).toHaveCount(1);
    await expect(page.locator(".agent-markdown pre code")).toContainText(
      "const example",
    );
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = page
      .locator(".agent-message.user")
      .getByRole("button", { name: "Copy message" });
    await expect(copy).toHaveText("");
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "hey",
    );
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate((theme) => {
        localStorage.setItem("roleway-theme", theme);
        document.documentElement.dataset.theme = theme;
      }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const history = page.getByLabel("Open Agent conversation history");
        await history.click();
        const menu = page.locator(".agent-history-popover");
        await expect(menu).toBeVisible();
        const bounds = await menu.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        const list = page.locator(".agent-history-list");
        expect(await list.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        const archive = menu.getByRole("button", { name: /^Archive/ });
        await archive.hover();
        expect(await list.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await list.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
        await page.screenshot({ path: `/tmp/roleway-history-${theme}-${width}.png` });
        await history.click();
        const bubble = await page
          .locator(".agent-message.user .agent-message-content")
          .boundingBox();
        expect(bubble!.width).toBeLessThan(100);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page
          .getByRole("button", { name: "Context and permissions", exact: true })
          .click();
        await expect(page.locator(".agent-context-popover")).toContainText(
          "You approve every internal change",
        );
        await page.keyboard.press("Escape");
        await page
          .getByRole("combobox", { name: "Agent provider", exact: true })
          .click();
        await expect(
          page.getByRole("option", { name: /Chat fixture/ }),
        ).toBeVisible();
        await page.getByRole("option", { name: /Chat fixture/ }).click();
        await input.fill("/create task");
        await expect(
          page
            .getByRole("listbox", { name: "Agent actions" })
            .getByRole("option"),
        ).toHaveCount(1);
        await input.press("Enter");
        await expect(input).toHaveValue(/Help me create a task/);
        await expect(
          page.getByRole("button", { name: "Send to Agent", exact: true }),
        ).toBeEnabled();
        const form = await page
          .locator(".agent-native-composer")
          .evaluate((element) => {
            const data = new FormData(element as HTMLFormElement);
            return {
              connectionId: data.get("connectionId"),
              message: data.get("message"),
            };
          });
        expect(form.connectionId).toBe(connection.data.id);
        expect(form.message).toContain("Help me create a task");
        await input.fill("");
        await expect(
          page.getByRole("button", { name: "Send to Agent", exact: true }),
        ).toBeDisabled();
      }
    }
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
