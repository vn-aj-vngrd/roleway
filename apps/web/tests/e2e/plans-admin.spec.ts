import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("plans, manual review, focused admin and public help", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/");
    await expect(page.locator("#pricing")).not.toContainText("Unlimited");
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: "How can we help?" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search help articles" })
      .fill("documents");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Keep documents and versions organized",
      }),
    ).toBeVisible();
    userId = await createFixtureAccount(
      `e2e-plans-${Date.now()}@roleway.test`,
      `Rw!${randomBytes(12).toString("hex")}`,
      page,
    );
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({ onboarding_completed: true, tour_completed: true })
      .eq("user_id", userId)
      .select("active_project_id")
      .single();
    if (profileError) throw profileError;
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/home/);
    await page.goto(`/admin/users/${userId}`);
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/settings/billing");
    await expect(
      page.getByRole("heading", { name: "Free plan", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Coming soon" })).toHaveCount(
      2,
    );
    const { error: limitError } = await admin
      .from("search_projects")
      .insert({ user_id: userId, name: "Over free limit" });
    expect(limitError?.message).toContain("PLAN_WORKSPACE_LIMIT");
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        user_id: userId,
        project_id: profile.active_project_id,
        title: "Synthetic support record",
        company: "Fixture only",
        description: "Exact fixture content for inspection",
      })
      .select("id")
      .single();
    if (jobError) throw jobError;
    // Payment fixture exercises review without enabling real public payments or changing prices.
    const { data: request, error: requestError } = await admin
      .from("payment_requests")
      .insert({
        user_id: userId,
        plan_slug: "plus",
        amount_minor: 14900,
        currency: "PHP",
        instructions_snapshot: {
          enabled: true,
          bank_name: "Fixture bank",
          account_name: "Test beneficiary",
          account_number: "TEST-ONLY",
          instructions: "No real payment. Disposable test request.",
          qr_image: "",
          support_email: "",
        },
      })
      .select("id")
      .single();
    if (requestError) throw requestError;
    await page.reload();
    await page
      .getByRole("textbox", { name: "Bank or wallet transfer reference" })
      .fill("TEST-NO-MONEY");
    await page
      .getByRole("button", { name: "I’ve paid — submit for review" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Payment under review" }),
    ).toBeVisible();
    const { error: roleError } = await admin
      .from("admin_members")
      .insert({ user_id: userId, role: "admin" });
    if (roleError) throw roleError;
    await page.goto("/admin?view=billing");
    await expect(
      page.getByRole("link", { name: "Back to app", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(0);
    const row = page.getByRole("row").filter({ hasText: request.id });
    await row
      .getByRole("textbox", { name: "Verification note or rejection reason" })
      .fill("Synthetic payment workflow test, no funds transferred");
    await row.getByRole("checkbox").check();
    await row.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page).toHaveURL(/saved=/);
    await page.goto("/settings/billing");
    await expect(
      page.getByRole("heading", { name: "Plus plan", exact: true }),
    ).toBeVisible();
    await page.goto(`/admin/users/${userId}?kind=jobs&record=${job.id}`);
    await expect(
      page.getByText("Exact fixture content for inspection", { exact: true }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Plan", exact: true }).click();
    await page
      .getByRole("option", { name: "Unlimited (private)", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Reason", exact: true })
      .fill("Explicit private plan fixture");
    await page
      .getByRole("button", { name: "Assign plan", exact: true })
      .click();
    await expect(page).toHaveURL(/saved=/);
    await page.goto("/settings/billing");
    await expect(
      page.getByRole("heading", { name: "Unlimited plan", exact: true }),
    ).toBeVisible();
    await expect(page.locator("progress")).toHaveCount(0);
    await expect(page.locator(".plan-comparison")).not.toContainText(
      "Unlimited",
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        await page.addInitScript(
          (t) => localStorage.setItem("roleway-theme", t),
          theme,
        );
        for (const [route, label] of [
          ["/admin?view=plans", "admin-plans"],
          ["/admin?view=users", "admin-users"],
          ["/settings/billing", "billing"],
          ["/help", "help"],
        ]) {
          await page.goto(route!);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator("main h1").first()).toBeVisible();
          if (label === "admin-users")
            await expect(page.getByRole("table")).toBeVisible();
          if (label === "admin-plans")
            await expect(
              page.getByRole("button", { name: "Save Free", exact: true }),
            ).toBeVisible();
          if (label === "billing")
            await expect(
              page.getByRole("heading", {
                name: "Unlimited plan",
                exact: true,
              }),
            ).toBeVisible();
          if (label === "help")
            await expect(
              page.getByRole("heading", {
                name: "Pay for a plan manually",
                exact: true,
              }),
            ).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          ).toBeLessThanOrEqual(1);
          await page.screenshot({
            path: `/tmp/roleway-${label}-${width}-${theme}.png`,
            fullPage: true,
          });
          if (label === "billing") {
            await page.locator(".settings-shell-main").evaluate((element) => {
              element.scrollTop = element.scrollHeight;
            });
            await page.screenshot({
              path: `/tmp/roleway-${label}-${width}-${theme}-bottom.png`,
              fullPage: true,
            });
          }
          if (label === "admin-users") {
            expect(
              await page
                .locator(".management-table small")
                .first()
                .evaluate((element) =>
                  parseFloat(getComputedStyle(element).fontSize),
                ),
            ).toBeGreaterThanOrEqual(13);
          }
        }
      }
    }
    await page.goto("/admin?view=plans");
    await expect(
      page.getByRole("button", { name: "Save Free", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("i");
    await expect(page).toHaveURL(/\/admin/);
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
