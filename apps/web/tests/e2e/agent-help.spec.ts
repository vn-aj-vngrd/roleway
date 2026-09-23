import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

test("Agent creation guide is searchable and readable on desktop and mobile", async ({
  page,
}) => {
  const sql = await readFile(
    "../../supabase/migrations/20260917051125_agent_creation_help.sql",
    "utf8",
  );
  const body = sql.split("$article$")[1];
  expect(body).toBeTruthy();
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const slug = `e2e-agent-help-${Date.now()}`;
  const inserted = await admin
    .from("help_articles")
    .insert({
      slug,
      title: "E2E Agent creation guide",
      summary: "Create Workspaces, tasks, notes, and Next Actions",
      body,
      published: true,
    });
  if (inserted.error) throw inserted.error;
  try {
    await page.goto(
      `/help?q=${encodeURIComponent("E2E Agent creation guide")}`,
    );
    await page.getByRole("link", { name: /E2E Agent creation guide/ }).click();
    await expect(
      page.getByRole("heading", { name: "E2E Agent creation guide" }),
    ).toBeVisible();
    for (const text of [
      "Create a Workspace",
      "Create a task",
      "Add a note",
      "Set a Next Action",
      "Review, correct, or reject",
      "If a change cannot be applied",
    ]) {
      await expect(page.locator("article")).toContainText(text);
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/roleway-agent-help-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
    }
  } finally {
    const removed = await admin.from("help_articles").delete().eq("slug", slug);
    if (removed.error) throw removed.error;
  }
});

test("full manual supports topics, search, structured steps, and related guides", async ({
  page,
}) => {
  const sql = await readFile(
    "../../supabase/migrations/20260917051422_complete_help_center_guides.sql",
    "utf8",
  );
  const rows = [
    ...sql.matchAll(
      /\('([^']+)', '((?:[^']|'')*)', '((?:[^']|'')*)', \$guide\$([\s\S]*?)\$guide\$, true\)/g,
    ),
  ].map((match) => ({
    slug: match[1]!,
    title: match[2]!.replace(/''/g, "'"),
    summary: match[3]!.replace(/''/g, "'"),
    body: match[4]!,
    published: true,
  }));
  expect(rows).toHaveLength(19);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const current = await admin
    .from("help_articles")
    .select("slug")
    .in(
      "slug",
      rows.map((row) => row.slug),
    );
  if (current.error) throw current.error;
  const existing = new Set(current.data.map((row) => row.slug));
  const missing = rows.filter((row) => !existing.has(row.slug));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    if (missing.length) {
      const result = await admin.from("help_articles").insert(missing);
      if (result.error) throw result.error;
    }
    await page.goto("/help");
    await expect(
      page.getByRole("link", { name: "Start the walkthrough" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Help topics" })
      .getByRole("link", { name: "Jobs and Opportunities" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Jobs and Opportunities",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: /Capture a Job and review your Inbox/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Step by step", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".help-guide-body ol li")).toHaveCount(4);
    await expect(
      page.getByRole("navigation", { name: "On this page" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Related guides" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Inbox", exact: true }),
    ).toHaveAttribute("href", "/inbox");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/roleway-help-guide-${width}.png`,
        fullPage: true,
        caret: "initial",
      });
    }
    await page.goto("/help?q=Agent%20drafts");
    await expect(
      page.getByRole("link", {
        name: /Explore your search and prepare drafts/,
      }),
    ).toBeVisible();
    await page.goto("/help?q=zznonexistentzz");
    await expect(page.getByRole("status")).toContainText(
      "No matching articles",
    );
    await page.evaluate(() => localStorage.setItem("roleway-theme", "dark"));
    await page.goto("/help");
    await page.screenshot({
      path: "/tmp/roleway-help-center-390-dark.png",
      fullPage: true,
      caret: "initial",
    });
    expect(errors).toEqual([]);
  } finally {
    if (missing.length) {
      const removed = await admin
        .from("help_articles")
        .delete()
        .in(
          "slug",
          missing.map((row) => row.slug),
        );
      if (removed.error) throw removed.error;
    }
  }
});
