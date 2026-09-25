import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServer, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Agent keeps background conversations, shows loading, and acknowledges completed work", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let userId = "";
  let response: ServerResponse | undefined;
  const server = createServer((request, res) => {
    request.resume();
    response = res;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
      "Access-Control-Allow-Origin": new URL(page.url()).origin,
      "Access-Control-Allow-Credentials": "true",
    });
    res.flushHeaders();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Stream fixture unavailable");
  const write = (part: unknown) =>
    response!.write(`data: ${JSON.stringify(part)}\n\n`);
  try {
    userId = await createFixtureAccount(
      `e2e-continuity-${Date.now()}@roleway.test`,
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
        label: "Continuity fixture",
        model: "fixture",
        encrypted_secret: "fixture-not-a-key",
        secret_iv: "fixture",
        key_hint: "fixture",
        status: "connected",
      })
      .select("id")
      .single();
    if (connection.error) throw connection.error;
    const conversations = await admin
      .from("agent_conversations")
      .insert([
        { ...ownership, title: "First conversation" },
        { ...ownership, title: "Second conversation" },
      ])
      .select("id,title");
    if (conversations.error) throw conversations.error;
    const first = conversations.data.find(
      (item) => item.title === "First conversation",
    )!;
    const second = conversations.data.find(
      (item) => item.title === "Second conversation",
    )!;
    const seeded = await admin.from("agent_messages").insert([
      {
        ...ownership,
        conversation_id: first.id,
        role: "agent",
        content: "First saved answer",
      },
      {
        ...ownership,
        conversation_id: second.id,
        role: "agent",
        content: "Second saved answer",
      },
    ]);
    if (seeded.error) throw seeded.error;
    await page.goto(`/agent?conversation=${first.id}`);
    // Verify the normal-user admin boundary before working with the account.
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin(?:\?|$)/);
    await page.goto(`/agent?conversation=${first.id}`);
    await expect(
      page.getByText("First saved answer", { exact: true }),
    ).toBeVisible();
    await page.route("**/agent?**", async (route) => {
      if (
        route.request().headers().rsc &&
        new URL(route.request().url()).searchParams.get("conversation") ===
          second.id
      )
        await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.getByLabel("Open Agent conversation history").click();
    await page
      .locator(".agent-history-list")
      .getByRole("link", { name: /Second conversation/ })
      .click();
    await expect(
      page.getByText("Loading conversation…", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/roleway-agent-conversation-loading.png",
    });
    await expect(
      page.getByLabel("Message Roleway Agent", { exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(
      page.getByText("Second saved answer", { exact: true }),
    ).toBeVisible();
    await page.unroute("**/agent?**");
    await page.getByLabel("Open Agent conversation history").click();
    await page
      .locator(".agent-history-list")
      .getByRole("link", { name: /First conversation/ })
      .click();
    await expect(
      page.getByText("First saved answer", { exact: true }),
    ).toBeVisible();
    const run = await admin
      .from("ai_runs")
      .insert({
        ...ownership,
        conversation_id: first.id,
        connection_id: connection.data.id,
        provider: "openrouter",
        model: "deepseek/deepseek-v4.1-flash",
        task_type: "conversation",
        status: "generating",
      })
      .select("id")
      .single();
    if (run.error) throw run.error;
    await page.route("**/api/agent/chat", (route) =>
      route.continue({ url: `http://127.0.0.1:${address.port}/stream` }),
    );
    await page
      .getByLabel("Message Roleway Agent", { exact: true })
      .fill("Keep working while I navigate");
    await page
      .getByRole("button", { name: "Send to Agent", exact: true })
      .click();
    await expect.poll(() => Boolean(response)).toBe(true);
    write({ type: "start", messageId: "continuity-fixture" });
    write({
      type: "data-started",
      data: { conversationId: first.id, runId: run.data.id },
      transient: true,
    });
    write({
      type: "data-progress", id: "work",
      data: { id: "work", label: "Context loaded", status: "completed" },
    });
    await expect(page.getByRole("status").filter({ hasText: "Preparing the response…" })).toBeVisible();
    write({
      type: "data-progress",
      id: "work",
      data: { id: "work", label: "Preparing the answer", status: "active" },
    });
    const agentNav = page.locator('.sidebar-primary-nav a[data-tour="agent"]');
    await expect(
      agentNav.getByRole("status", { name: "Agent is working" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(
      page
        .locator('.mobile-nav a[data-tour="agent"]')
        .getByRole("status", { name: "Agent is working" }),
    ).toBeVisible();
    await page.screenshot({ path: "/tmp/roleway-agent-working-mobile.png" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByLabel("Open Agent conversation history").click();
    await page
      .locator(".agent-history-list")
      .getByRole("link", { name: /Second conversation/ })
      .click();
    await expect(
      page.getByText("Second saved answer", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Message Roleway Agent", { exact: true }),
    ).not.toHaveAttribute("readonly", "");
    await expect(
      page.getByText("Keep working while I navigate", { exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Open Agent conversation history").click();
    await page
      .locator(".agent-history-list")
      .getByRole("link", { name: /First conversation/ })
      .click();
    await expect(
      page.getByText("Keep working while I navigate", { exact: true }),
    ).toHaveCount(1);
    await page.locator('.sidebar-primary-nav a[href="/insights"]').click();
    await expect(page).toHaveURL(/\/insights/);
    await expect(agentNav).toHaveAttribute(
      "href",
      `/agent?conversation=${first.id}`,
    );
    await agentNav.click();
    await expect(
      page.getByText("Keep working while I navigate", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("status").filter({ hasText: "Preparing the answer" }),
    ).toBeVisible();
    await page.locator('.sidebar-primary-nav a[href="/insights"]').click();
    await expect(
      page.getByRole("heading", { name: "Insights", exact: true }),
    ).toBeVisible();
    const savedStep = await admin.from("agent_run_steps").insert({
      ...ownership, conversation_id: first.id, run_id: run.data.id,
      position: 10, label: "Read Career Profile and Workspace context", status: "completed",
    });
    if (savedStep.error) throw savedStep.error;
    const complete = await admin.rpc("complete_agent_run", {
      input_run_id: run.data.id,
      input_output: { message: "Background answer is ready", proposals: [] },
      input_tokens: 3968,
      output_tokens: 289,
    });
    if (complete.error) throw complete.error;
    write({
      type: "data-answer",
      id: "answer",
      data: { text: "Background answer is ready" },
    });
    write({
      type: "data-result",
      data: { href: `/agent?conversation=${first.id}` },
      transient: true,
    });
    write({ type: "finish" });
    response!.end("data: [DONE]\n\n");
    await expect(
      agentNav.getByRole("status", { name: "Agent response ready" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/insights/);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const nav =
          width === 390
            ? page.locator('.mobile-nav a[data-tour="agent"]')
            : agentNav;
        await expect(
          nav.getByRole("status", { name: "Agent response ready" }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `/tmp/roleway-agent-ready-${theme}-${width}.png`,
        });
      }
    }
    await page.locator('.mobile-nav a[data-tour="agent"]').click();
    await expect(
      page.getByText("Background answer is ready", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("status", { name: "Agent response ready" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Send to Agent", exact: true }),
    ).toBeDisabled(); // Empty composer, no request pending.
    await expect(
      page.getByLabel("Message Roleway Agent", { exact: true }),
    ).not.toHaveAttribute("readonly", "");
    const responseMessage = page.getByRole("article", { name: "Agent response", exact: true }).filter({ hasText: "Background answer is ready" });
    await responseMessage.locator(".agent-work-trigger").click();
    const usage = responseMessage.getByLabel("Model and token usage");
    await expect(usage).toContainText("deepseek/deepseek-v4.1-flash");
    await expect(usage).toContainText("3,968");
    await expect(usage).toContainText("289");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await responseMessage.hover();
        const row = responseMessage.locator(".agent-work-steps > p").first();
        const icon = await row.locator("svg").boundingBox();
        const label = await row.locator("span").boundingBox();
        expect(Math.abs(icon!.y + icon!.height / 2 - label!.y - label!.height / 2)).toBeLessThan(1);
        expect(await usage.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/roleway-agent-polish-${theme}-${width}.png` });
      }
    }
    const copy = responseMessage.getByRole("button", { name: "Copy message", exact: true });
    await copy.focus();
    await expect(copy).toHaveCSS("opacity", "1");
    await expect(copy).toHaveCSS("transition-duration", "0.2s");
    await page.getByLabel("Message Roleway Agent", { exact: true }).focus();
    await page.mouse.move(0, 0);
    await expect(copy).toHaveCSS("opacity", "0");
    await expect(copy).toHaveCSS("transition-duration", "0.14s");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(copy).toHaveCSS("transition-duration", "0s");
    await copy.focus();
    await expect(copy).toHaveCSS("transition-duration", "0s");
    await expect(copy).toHaveCSS("opacity", "1");
    expect(errors).toEqual([]);
  } finally {
    response?.end();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
