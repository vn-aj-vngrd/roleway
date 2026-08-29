import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const email = `e2e-notifications-${Date.now()}-${randomBytes(3).toString("hex")}@roleway.test`;
const password = `Rw!${randomBytes(12).toString("hex")}`;
let userId = "";

const adminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase E2E environment is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
};

test("mark all read clears every unread notification", async ({ page }) => {
  test.setTimeout(45_000);

  try {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/onboarding");
    await page.getByLabel("Full name").fill("Notification Test");
    await page.getByLabel("Professional headline").fill("Product Engineer");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Workspace name").fill("Notification workspace");
    await page.getByLabel("Target role").fill("Product Engineer");
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("button", { name: "Create Workspace and start tour" })
      .click();
    await page.waitForURL("**/home?tour=true");
    await page.getByRole("button", { name: "Skip product tour" }).click();
    await expect(
      page.getByRole("dialog", { name: "Keep each search focused" }),
    ).toBeHidden();

    const admin = adminClient();
    const { data: users, error: usersError } = await admin.auth.admin.listUsers(
      { page: 1, perPage: 1000 },
    );
    if (usersError) throw usersError;
    userId = users.users.find((user) => user.email === email)?.id ?? "";
    expect(userId).not.toBe("");

    const { data: project, error: projectError } = await admin
      .from("search_projects")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (projectError) throw projectError;

    const { error: insertError } = await admin.from("notifications").insert([
      {
        user_id: userId,
        project_id: project.id,
        notification_type: "task",
        title: "First unread notification",
        href: "/home",
      },
      {
        user_id: userId,
        project_id: project.id,
        notification_type: "interview",
        title: "Second unread notification",
        href: "/interview",
      },
    ]);
    if (insertError) throw insertError;

    await page.goto("/notifications");
    const firstNotification = page
      .getByText("First unread notification")
      .locator("xpath=ancestor::article");
    const secondNotification = page
      .getByText("Second unread notification")
      .locator("xpath=ancestor::article");
    await expect(firstNotification).toHaveClass(/is-unread/);
    await expect(secondNotification).toHaveClass(/is-unread/);
    await expect(
      page.getByRole("link", { name: /Notifications.*2 unread/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Mark all read" }).click();

    await expect(firstNotification).toHaveClass(/is-read/);
    await expect(secondNotification).toHaveClass(/is-read/);
    await expect(
      page.getByRole("button", { name: "Mark all read" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Notifications.*unread/ }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: /^Unread/ }).click();
    await expect(
      page.getByRole("heading", { name: "No unread notifications" }),
    ).toBeVisible();

    const { count, error: unreadError } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (unreadError) throw unreadError;
    expect(count).toBe(0);
  } finally {
    if (userId) await adminClient().auth.admin.deleteUser(userId);
  }
});
