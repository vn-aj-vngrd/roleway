import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { completeSignupVerification } from "./auth-fixture";

test.use({ trace: "off", screenshot: "off" });
test("signup confirmation verifies email in a fresh browser and rejects reuse", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `e2e-confirm-${Date.now()}@roleway.test`;
  const password = `Rw!${randomBytes(12).toString("hex")}`;
  const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email, password });
  if (error) throw error;
  try {
    expect(data.user.email_confirmed_at).toBeFalsy();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/verify-email?sent=true");
      await expect(page.getByRole("heading", { name: "Verify your email", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    const url = await completeSignupVerification(email, password, page);
    await expect(page).toHaveURL(/\/onboarding$/);
    const confirmed = await admin.auth.admin.getUserById(data.user.id);
    expect(confirmed.error).toBeNull();
    expect(confirmed.data.user?.email_confirmed_at).toBeTruthy();
    expect(url).toBeTruthy();
    await page.goto(url!);
    await expect(page).toHaveURL(/\/verify-email\?error=/);
    await expect(page.getByRole("alert").filter({ hasText: "invalid or expired" })).toBeVisible();
  } finally {
    const cleanup = await admin.auth.admin.deleteUser(data.user.id);
    if (cleanup.error) throw cleanup.error;
  }
});
