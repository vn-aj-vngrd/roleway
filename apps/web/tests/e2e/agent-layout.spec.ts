import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    for (const existing of [false, true]) {
      test(`Agent answer stays in place after persistence at ${width}px in ${theme} (${existing ? "existing long conversation" : "new conversation"})`, async ({
        page,
      }) => {
        page.setDefaultTimeout(15_000);
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );
        let userId = "";
        let streamBody = "";
        let finishStream = () => {};
        const streamServer = createServer((request, response) => {
          request.resume();
          response.writeHead(200, {
            "Content-Type": "text/event-stream",
            "x-vercel-ai-ui-message-stream": "v1",
            "Access-Control-Allow-Origin": new URL(page.url()).origin,
            "Access-Control-Allow-Credentials": "true",
          });
          response.write(streamBody);
          finishStream = () =>
            response.end('data: {"type":"finish"}\n\ndata: [DONE]\n\n');
        });
        await new Promise<void>((resolve) =>
          streamServer.listen(0, "127.0.0.1", resolve),
        );
        const address = streamServer.address();
        if (!address || typeof address === "string")
          throw new Error("Stream fixture unavailable");
        let releaseRefresh = () => {};
        const refreshGate = new Promise<void>((resolve) => {
          releaseRefresh = resolve;
        });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme });
          userId = await createFixtureAccount(
            `e2e-layout-${Date.now()}@roleway.test`,
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
              label: "Layout fixture",
              model: "fixture",
              encrypted_secret: "fixture",
              secret_iv: "fixture",
              key_hint: "fixture",
              status: "connected",
            })
            .select("id")
            .single();
          if (connection.error) throw connection.error;
          const conversation = await admin
            .from("agent_conversations")
            .insert({ ...ownership, title: "Stable answer" })
            .select("id")
            .single();
          if (conversation.error) throw conversation.error;
          const href = `/agent?conversation=${conversation.data.id}`;
          const answer =
            "## Your next step\n\nPrepare **one example** before the interview.\n\n- Review the role\n- Choose your evidence" +
            (existing
              ? "\n\nMore preparation detail to review.".repeat(40)
              : "");
          await page.goto(existing ? href : "/agent?new=layout-fixture");
          await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
          }, theme);
          await page.route("**/agent?**", async (route) => {
            if (route.request().headers()["rsc"] === "1") {
              const response = await route.fetch();
              await refreshGate;
              await route.fulfill({ response });
            } else await route.continue();
          });
          await page.route("**/api/agent/chat", async (route) => {
            const run = await admin
              .from("ai_runs")
              .insert({
                ...ownership,
                conversation_id: conversation.data.id,
                connection_id: connection.data.id,
                provider: "openai",
                model: "fixture",
                task_type: "conversation",
                status: "generating",
              })
              .select("id")
              .single();
            if (run.error) throw run.error;
            const message = await admin.from("agent_messages").insert({
              ...ownership,
              conversation_id: conversation.data.id,
              run_id: run.data.id,
              role: "user",
              content: "Help me prepare",
            });
            if (message.error) throw message.error;
            const complete = await admin.rpc("complete_agent_run", {
              input_run_id: run.data.id,
              input_output: { message: answer, proposals: [] },
              input_tokens: 10,
              output_tokens: 20,
            });
            if (complete.error) throw complete.error;
            streamBody = [
              { type: "start", messageId: "layout-answer" },
              {
                type: "data-started",
                data: {
                  conversationId: conversation.data.id,
                  runId: run.data.id,
                },
                transient: true,
              },
              { type: "data-answer", id: "answer", data: { text: answer } },
              { type: "data-result", data: { href }, transient: true },
            ]
              .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
              .join("");
            await route.continue({
              url: `http://127.0.0.1:${address.port}/stream`,
            });
          });
          await page
            .getByLabel("Message Roleway Agent", { exact: true })
            .fill("Help me prepare");
          await page
            .getByRole("button", { name: "Send to Agent", exact: true })
            .click();
          const heading = page.getByRole("heading", { name: "Your next step" });
          await expect(heading).toBeVisible();
          if (existing) {
            await page.locator(".agent-transcript").evaluate((el) => {
              el.scrollTop = 0;
            });
            await expect(heading).toBeInViewport();
          }
          const receiving = await heading.boundingBox();
          finishStream();
          await expect(page.getByText(/^Worked for/)).toBeVisible();
          const before = await heading.boundingBox();
          expect(
            Math.abs(before!.y - receiving!.y),
            "Answer moved when the run finished",
          ).toBeLessThan(2);
          const composerBefore = await page
            .locator(".agent-native-composer")
            .boundingBox();
          releaseRefresh();
          await expect(page.locator(".agent-streaming-answer")).toHaveCount(0);
          await expect(
            page.locator(".agent-message.agent .agent-message-actions"),
          ).toBeVisible();
          const after = await heading.boundingBox();
          const composerAfter = await page
            .locator(".agent-native-composer")
            .boundingBox();
          expect(
            Math.abs(after!.y - before!.y),
            "Answer moved when the saved message replaced the stream",
          ).toBeLessThan(2);
          expect(
            Math.abs(composerAfter!.y - composerBefore!.y),
            "Composer moved after persistence",
          ).toBeLessThan(2);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
          expect(Math.abs(after!.width - before!.width)).toBeLessThan(2);
          if (existing)
            expect(
              await page
                .locator(".agent-transcript")
                .evaluate((el) => el.scrollTop),
            ).toBe(0);
          await page.screenshot({
            path: `/tmp/roleway-agent-layout-${width}-${theme}-${existing ? "existing" : "new"}.png`,
          });
          if (width === 1440 && !existing) {
            await page.goto("/home");
            await page
              .getByRole("button", { name: "Open Roleway Agent", exact: true })
              .click();
            const mini = page.getByRole("dialog", {
              name: "Roleway Agent",
              exact: true,
            });
            await mini
              .getByRole("button", { name: "New conversation", exact: true })
              .click();
            await mini
              .getByRole("textbox", { name: "Ask Roleway Agent" })
              .fill("Help me prepare");
            await mini
              .getByRole("button", { name: "Send message", exact: true })
              .click();
            const miniHeading = mini.getByRole("heading", {
              name: "Your next step",
            });
            await expect(miniHeading).toBeVisible();
            const miniBefore = await miniHeading.boundingBox();
            finishStream();
            await expect(mini.getByText(/^Worked for/)).toBeVisible();
            expect(
              Math.abs((await miniHeading.boundingBox())!.y - miniBefore!.y),
              "Floating answer moved when the run finished",
            ).toBeLessThan(2);
          }
          expect(errors).toEqual([]);
        } finally {
          finishStream();
          releaseRefresh();
          await page.unrouteAll({ behavior: "wait" });
          streamServer.closeAllConnections();
          await new Promise<void>((resolve) =>
            streamServer.close(() => resolve()),
          );
          if (userId) {
            const result = await admin.auth.admin.deleteUser(userId);
            if (result.error) throw result.error;
          }
        }
      });
    }
  }
}
