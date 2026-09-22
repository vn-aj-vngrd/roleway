import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServer, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Agent formats Markdown and keeps composer controls usable across sizes and themes", async ({
  page,
}) => {
  page.setDefaultTimeout(15_000);
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
    const historyFixtures = await admin.from("agent_conversations").insert(
      Array.from({ length: 20 }, (_, index) => ({
        ...ownership,
        title: `Earlier conversation ${index + 1}`,
        updated_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
      })),
    );
    if (historyFixtures.error) throw historyFixtures.error;
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
    await page.locator(".agent-message.user").hover();
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
        const archive = menu.getByRole("button", { name: /^Archive/ }).first();
        await archive.hover();
        expect(await list.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(bounds!.height).toBeLessThanOrEqual(480);
        expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
        await expect(menu.locator("time").first()).toHaveText(/Just now|minutes? ago/);
        const head = await menu.locator(".agent-history-popover-head").boundingBox();
        await list.locator(".agent-history-row").last().scrollIntoViewIfNeeded();
        expect(await list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        expect((await menu.locator(".agent-history-popover-head").boundingBox())!.y).toBe(head!.y);
        await expect(menu.locator("time").last()).toHaveText("2 weeks ago");
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
        await expect(page.getByRole("link", { name: "Creation guide", exact: true })).toHaveCount(0);
        await page.goto("/agent");
        await page.getByRole("button", { name: "Agent Opportunity focus", exact: true }).click();
        const focusPanel = page.locator(".agent-capability-popover");
        await expect(focusPanel).toContainText("Conversation focus");
        expect(await focusPanel.evaluate(el => el.clientWidth)).toBe(await page.locator(".agent-message-input").evaluate(el => el.clientWidth));
        expect(await focusPanel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.getByRole("button", { name: "All workspaces", exact: true }).click();
        await expect(focusPanel).toHaveCount(0);
        const modelMetrics = await page.locator('.agent-model-label').evaluate(el => ({ font: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight) }));
        expect(modelMetrics.line).toBeGreaterThan(modelMetrics.font * 1.3);
        await page.goto(`/agent?conversation=${conversation.data.id}`);
        await page
          .getByRole("button", { name: "Context and permissions", exact: true })
          .click();
        await expect(page.locator(".agent-context-popover")).toContainText(
          "You approve every internal change",
        );
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Agent provider", exact: true })
          .click();
        await expect(page.locator(".agent-capability-popover")).toContainText("Choose a saved provider connection");
        expect(await page.locator(".agent-capability-popover").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await expect(
          page.getByRole("button", { name: /Chat fixture/ }),
        ).toBeVisible();
        await page.getByRole("button", { name: /Chat fixture/ }).click();
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
        const composer = page.locator(".agent-native-composer");
        const beforeError = await composer.boundingBox();
        await page.goto(`/agent?conversation=${conversation.data.id}&error=Agent%20could%20not%20complete%20that%20request.`);
        await expect(page.locator(".agent-inline-state[role=alert]")).toContainText("Agent could not complete");
        await expect(input).toBeVisible();
        const afterError = await composer.boundingBox();
        expect(Math.abs(afterError!.y - beforeError!.y)).toBeLessThan(2);
        expect(await page.locator(".agent-transcript").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.locator(".agent-transcript").evaluate(el => Math.abs(el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right))).toBeLessThan(2);
        const footer = page.locator(".agent-message.user .agent-message-actions");
        await expect(footer.locator("time")).toContainText(/\d{1,2}:\d{2}/);
        const copyControl = footer.getByRole("button", { name: "Copy message" });
        await page.locator(".agent-native-routebar").hover();
        await expect(copyControl).toHaveCSS("opacity", "0");
        await expect(footer.locator("time")).toHaveCSS("opacity", "0");
        await page.locator(".agent-message.user").hover();
        await expect(copyControl).toHaveCSS("opacity", "1");
        await expect(footer.locator("time")).toHaveCSS("opacity", "1");
        await copyControl.focus();
        await page.locator(".agent-native-routebar").hover();
        await expect(copyControl).toHaveCSS("opacity", "1");
        await expect(footer.locator("time")).toHaveCSS("opacity", "1");
        await page.screenshot({ path: `/tmp/roleway-error-${theme}-${width}.png` });
        await page.goto(`/agent?conversation=${conversation.data.id}`);
        await expect(input).toBeVisible();
      }
    }
    // Serve a paced AI SDK stream to exercise intermediate UI, without a live model call.
    let response: ServerResponse | undefined;
    let arrived!: () => void;
    const requestArrived = new Promise<void>(resolve => { arrived = resolve; });
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
      arrived();
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server unavailable");
    const write = (chunk: unknown) => response!.write(`data: ${JSON.stringify(chunk)}\n\n`);
    try {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.route("**/api/agent/chat", route => route.continue({ url: `http://127.0.0.1:${address.port}/stream` }));
      await input.fill("Help me prepare my next step");
      await page.getByRole("button", { name: "Send to Agent", exact: true }).click();
      await requestArrived;
      await expect(input).toHaveValue("");
      await expect(page.getByText("Help me prepare my next step", { exact: true })).toBeVisible();
      await expect(page.getByText(/^Working for/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Agent is working", exact: true })).toBeDisabled();
      write({ type: "start", messageId: "stream-fixture" });
      write({ type: "data-progress", id: "10", data: { id: "10", label: "Reading Workspace context", status: "active" } });
      await expect(page.getByRole("status").filter({ hasText: "Reading Workspace context" })).toBeVisible();
      const timeline = page.locator(".agent-work-timeline").last();
      await timeline.locator("summary").click();
      await expect(timeline.locator(".agent-work-steps")).toContainText("Reading Workspace context");
      write({ type: "data-progress", id: "10", data: { id: "10", label: "Read Workspace context", status: "completed" } });
      write({ type: "data-answer", id: "answer", data: { text: "## Start here\n\nPrepare" } });
      await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
      await expect(page.getByText(/^Working for/)).toBeVisible();
      write({ type: "data-answer", id: "answer", data: { text: "## Start here\n\nPrepare **one concrete example**." } });
      await expect(page.locator(".agent-streaming-answer strong")).toHaveText("one concrete example");
      await page.screenshot({ path: "/tmp/roleway-working-mobile.png" });
      const transcriptNode = await page.locator(".agent-transcript").elementHandle();
      const run = await admin.from("ai_runs").insert({ ...ownership, conversation_id: conversation.data.id, connection_id: connection.data.id, provider: "openai", model: "fixture", task_type: "conversation", status: "generating" }).select("id").single();
      if (run.error) throw run.error;
      const complete = await admin.rpc("complete_agent_run", { input_run_id: run.data.id, input_output: { message: "## Start here\n\nPrepare **one concrete example**.", proposals: [] }, input_tokens: 10, output_tokens: 20 });
      if (complete.error) throw complete.error;
      write({ type: "data-result", data: { href: `/agent?conversation=${conversation.data.id}` }, transient: true });
      write({ type: "finish" });
      response!.end("data: [DONE]\n\n");
      await expect(page.getByText(/^Worked for/)).toBeVisible();
      await expect(page.getByText(/^Working for/)).toHaveCount(0);
      await expect(page.locator(".agent-message-author")).toHaveCount(0);
      await page.locator(".agent-work-timeline").last().locator("summary").click();
      await expect(page.locator(".agent-work-steps").last()).toContainText("fixture");
      expect(await transcriptNode!.evaluate(el => el.isConnected)).toBe(true);
      await expect(input).toHaveValue("");
      await expect(page.getByRole("heading", { name: "Start here" })).toHaveCount(1);
      await page.screenshot({ path: "/tmp/roleway-worked-mobile.png" });
    } finally {
      response?.end();
      await page.unroute("**/api/agent/chat");
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/home");
    await expect(page.locator(".sidebar-profile .user-state")).toHaveText("Free");
    const homeEmpty = page.locator(".home-clear-state");
    await expect(homeEmpty).toBeVisible();
    expect(await homeEmpty.evaluate(el => {
      const parent = el.parentElement!;
      return Math.abs(el.getBoundingClientRect().left - parent.getBoundingClientRect().left) < 2;
    })).toBe(true);
    await expect(homeEmpty.getByRole("button", { name: "Add a job", exact: true })).toHaveAttribute("data-variant", "default");
    await expect(homeEmpty.locator("button svg")).toBeVisible();
    await page.getByRole("button", { name: "Open Roleway Agent", exact: true }).press("Enter");
    const mini = page.getByRole("dialog", { name: "Roleway Agent", exact: true });
    await expect(mini.getByRole("heading", { name: "What can I help with?" })).toBeVisible();
    await expect(mini.getByRole("link", { name: "Open full Agent" })).toHaveAttribute("href", `/agent?workspace=${ownership.project_id}&page=home`);
    await mini.getByRole("textbox", { name: "Ask Roleway Agent" }).fill("Keep my contextual draft");
    await mini.getByRole("link", { name: "Open full Agent" }).click();
    await expect(input).toHaveValue("Keep my contextual draft");
    await expect(page.locator('input[name="workspaceId"]')).toHaveValue(ownership.project_id);
    await expect(page.locator('input[name="contextPage"]')).toHaveValue("home");
    await page.goto("/home");
    await page.getByRole("button", { name: "Open Roleway Agent", exact: true }).press("Enter");
    await page.screenshot({ path: "/tmp/roleway-mini-agent-empty.png", animations: "disabled" });
    await page.route("**/api/agent/chat", route => route.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: [
        { type: "start", messageId: "mini-fixture" },
        { type: "data-started", data: { conversationId: conversation.data.id, runId: "fixture" }, transient: true },
        { type: "data-progress", id: "read", data: { id: "read", label: "Read Workspace context", status: "completed" } },
        { type: "data-answer", id: "answer", data: { text: "## Your next step\n\nPrepare **one example** before the interview." } },
        { type: "data-result", data: { href: `/agent?conversation=${conversation.data.id}` }, transient: true },
        { type: "finish" },
      ].map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n",
    }));
    try {
      await mini.getByRole("textbox", { name: "Ask Roleway Agent" }).fill("Help me prepare");
      await mini.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(mini.getByRole("heading", { name: "Your next step" })).toBeVisible();
      await expect(mini.locator(".agent-message.agent strong")).toHaveText("one example");
      await expect(mini.getByText(/^Worked for/)).toBeVisible();
      await expect(mini.locator(".agent-work-timeline > summary")).toHaveCSS("display", "flex");
      await expect(mini.getByRole("link", { name: "Open full Agent" })).toHaveAttribute("href", `/agent?conversation=${conversation.data.id}`);
      expect(new URL(page.url()).pathname).toBe("/home");
      expect(await mini.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: "/tmp/roleway-mini-agent-answer.png", animations: "disabled" });
    } finally { await page.unroute("**/api/agent/chat"); }
    await mini.getByRole("button", { name: "Close Agent", exact: true }).click();
    // Expanding an active mini chat keeps its transport mounted until persistence completes.
    const handoff = await admin.from("agent_conversations").insert({ ...ownership, title: "Streaming handoff", scope_mode: "workspace", context_page: "documents" }).select("id").single();
    if (handoff.error) throw handoff.error;
    const handoffRun = await admin.from("ai_runs").insert({ ...ownership, conversation_id: handoff.data.id, connection_id: connection.data.id, provider: "openai", model: "fixture", task_type: "conversation", status: "generating" }).select("id").single();
    if (handoffRun.error) throw handoffRun.error;
    const handoffMessage = await admin.from("agent_messages").insert({ ...ownership, conversation_id: handoff.data.id, run_id: handoffRun.data.id, role: "user", content: "Review my documents" });
    if (handoffMessage.error) throw handoffMessage.error;
    let handoffResponse: ServerResponse | undefined;
    const handoffServer = createServer((request, res) => {
      request.resume();
      handoffResponse = res;
      res.writeHead(200, { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1", "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Credentials": "true" });
      for (const chunk of [{ type: "start", messageId: "handoff" }, { type: "data-started", data: { conversationId: handoff.data.id, runId: handoffRun.data.id }, transient: true }]) res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
    await new Promise<void>(resolve => handoffServer.listen(0, "127.0.0.1", resolve));
    const handoffAddress = handoffServer.address();
    if (!handoffAddress || typeof handoffAddress === "string") throw new Error("Handoff server unavailable");
    try {
      await page.goto("/documents");
      await page.getByRole("button", { name: "Open Roleway Agent", exact: true }).press("Enter");
      await page.route("**/api/agent/chat", route => {
        expect(route.request().postDataJSON()).toMatchObject({ workspaceId: ownership.project_id, contextPage: "documents" });
        return route.continue({ url: `http://127.0.0.1:${handoffAddress.port}/stream` });
      });
      await mini.getByRole("textbox", { name: "Ask Roleway Agent" }).fill("Review my documents");
      await mini.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(mini.getByRole("link", { name: "Open full Agent" })).toHaveAttribute("href", `/agent?conversation=${handoff.data.id}`);
      await mini.getByRole("link", { name: "Open full Agent" }).click();
      await expect(page.getByText("Review my documents", { exact: true })).toBeVisible();
      await expect(page.locator(".agent-native-scope")).toContainText("Documents");
      const handoffComplete = await admin.rpc("complete_agent_run", { input_run_id: handoffRun.data.id, input_output: { message: "## Documents reviewed\n\n- Prepare your next draft.", proposals: [] }, input_tokens: 10, output_tokens: 20 });
      if (handoffComplete.error) throw handoffComplete.error;
      expect(handoffResponse?.destroyed).toBe(false);
      for (const chunk of [{ type: "data-result", data: { href: `/agent?conversation=${handoff.data.id}` }, transient: true }, { type: "finish" }]) handoffResponse!.write(`data: ${JSON.stringify(chunk)}\n\n`);
      handoffResponse!.end("data: [DONE]\n\n");
      await expect(page.getByRole("heading", { name: "Documents reviewed" })).toBeVisible();
      await expect(input).toBeEditable();
    } finally {
      handoffResponse?.end();
      await page.unroute("**/api/agent/chat");
      handoffServer.closeAllConnections();
      await new Promise<void>(resolve => handoffServer.close(() => resolve()));
    }
    await page.goto(`/agent?workspace=${ownership.project_id}&page=home`);
    // The real authenticated stream route must persist failures without exposing provider details.
    await input.fill("Check the saved connection safely");
    await page.getByRole("button", { name: "Send to Agent", exact: true }).click();
    await expect(page.locator(".agent-inline-state[role=alert]")).toContainText("Agent could not complete");
    await expect(page.locator(".agent-transcript").getByText("Check the saved connection safely", { exact: true })).toBeVisible();
    await expect(page.locator(".agent-work-failed").last()).toBeVisible();
    await expect(page.getByText(/^Working for/)).toHaveCount(0);
    await expect(input).toBeEditable();
    await expect(input).toHaveValue("");
    const savedContextId = new URL(page.url()).searchParams.get("conversation");
    expect(savedContextId).toBeTruthy();
    const scoped = await admin.from("agent_conversations").select("scope_mode,context_page,project_id").eq("id", savedContextId!).single();
    expect(scoped.data).toEqual({scope_mode:"workspace",context_page:"home",project_id:ownership.project_id});
    const changedScope = await admin.from("agent_conversations").update({scope_mode:"account"}).eq("id", savedContextId!);
    expect(changedScope.error?.message).toContain("Start a new conversation");
    await page.goto("/settings/ai");
    await expect(page.getByText("Changes stay in your control", { exact: true })).toHaveCount(0);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator(".connection-row")).toBeVisible();
        expect(await page.locator(".connection-row").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/roleway-provider-${theme}-${width}.png`, animations: "disabled" });
      }
    }
    const testButton = page.getByRole("button", { name: "Test Chat fixture", exact: true });
    await expect(testButton).toHaveText("");
    await testButton.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Test connection");
    await page.keyboard.press("Escape");
    const deleteButton = page.locator('.connection-row button[data-tooltip="Delete connection"]');
    await deleteButton.hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Delete connection");
    expect(await tooltip.evaluate(el => !el.closest('.connection-row'))).toBe(true);
    const tooltipBounds = await tooltip.boundingBox();
    expect(tooltipBounds!.x).toBeGreaterThanOrEqual(0);
    expect(tooltipBounds!.x + tooltipBounds!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "/tmp/roleway-connection-tooltip.png", animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    const original = await admin.from("ai_connections").select("encrypted_secret, secret_iv, status").eq("id", connection.data.id).single();
    if (original.error) throw original.error;
    await page.getByRole("button", { name: "Edit Chat fixture", exact: true }).click();
    await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Model", { exact: true })).toHaveValue("long-model-name-for-responsive-review");
    const closeDialog = page.getByRole("button", { name: "Close Edit connection", exact: true });
    await closeDialog.hover();
    await expect(tooltip).toContainText("Close");
    expect(await tooltip.evaluate(el => Boolean(el.closest('dialog[open]')))).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByLabel("Connection name", { exact: true }).fill("Renamed connection");
    await page.screenshot({ path: "/tmp/roleway-edit-connection-mobile.png", animations: "disabled" });
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const renamed = await admin.from("ai_connections").select("encrypted_secret, secret_iv, status").eq("id", connection.data.id).single();
    expect(renamed.data).toEqual(original.data);
    await page.getByRole("button", { name: "Edit Renamed connection", exact: true }).click();
    await page.getByLabel("Model", { exact: true }).fill("updated-model");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".connection-row")).toContainText("Not tested");
    const updated = await admin.from("ai_connections").select("encrypted_secret, model, status").eq("id", connection.data.id).single();
    expect(updated.data).toEqual({ encrypted_secret: original.data.encrypted_secret, model: "updated-model", status: "untested" });
    await page.getByRole("button", { name: "Edit Renamed connection", exact: true }).click();
    await page.getByLabel("API key", { exact: true }).fill("fixture-replacement-key");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const replaced = await admin.from("ai_connections").select("encrypted_secret, key_hint").eq("id", connection.data.id).single();
    expect(replaced.data?.encrypted_secret).not.toBe(original.data.encrypted_secret);
    expect(replaced.data?.key_hint).toBe("••••-key");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/help");
    await page.locator('a[href="/help/agent-create"]').click();
    await expect(page.locator("h1")).toContainText(/Agent|Creat/);
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
