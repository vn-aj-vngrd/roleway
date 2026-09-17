import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

test("Agent creation guide is searchable and readable on desktop and mobile", async ({ page }) => {
  const sql = await readFile("../../supabase/migrations/20260917051125_agent_creation_help.sql", "utf8");
  const body = sql.split("$article$")[1];
  expect(body).toBeTruthy();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const slug = `e2e-agent-help-${Date.now()}`;
  const inserted = await admin.from("help_articles").insert({ slug, title: "E2E Agent creation guide", summary: "Create Workspaces, tasks, notes, and Next Actions", body, published: true });
  if (inserted.error) throw inserted.error;
  try {
    await page.goto(`/help?q=${encodeURIComponent("E2E Agent creation guide")}`);
    await page.getByRole("link", { name: /E2E Agent creation guide/ }).click();
    await expect(page.getByRole("heading", { name: "E2E Agent creation guide" })).toBeVisible();
    for (const text of ["Create a Workspace", "Create a task", "Add a note", "Set a Next Action", "Review, correct, or reject", "If a change cannot be applied"]) {
      await expect(page.locator("article")).toContainText(text);
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/roleway-agent-help-${width}.png`, fullPage: true });
    }
  } finally {
    const removed = await admin.from("help_articles").delete().eq("slug", slug);
    if (removed.error) throw removed.error;
  }
});
