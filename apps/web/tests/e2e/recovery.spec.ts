import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

test.use({ trace: "off", screenshot: "off" });
test("email recovery opens a password form and saves the new password", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `e2e-recovery-${Date.now()}@roleway.test`;
  const { data: account, error } = await admin.auth.admin.createUser({ email, password: `Rw!${randomBytes(12).toString("hex")}`, email_confirm: true });
  if (error) throw error;
  try {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (linkError) throw linkError;
    await page.goto(`/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`);
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
    const password = `Rw!${randomBytes(12).toString("hex")}`;
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("Confirm new password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/login\?message=Password/);
    await expect(page.getByText("Password updated. Log in with your new password.")).toBeVisible();
    await page.goto(`/auth/callback?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`);
    await expect(page.getByText("That recovery link is invalid or expired.", { exact: true })).toBeVisible();
  } finally {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(account.user.id);
    if (cleanupError) throw cleanupError;
  }
});

test("implicit invitation session opens the password form without leaving tokens in the URL", async ({ page }) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `e2e-invite-${Date.now()}@roleway.test`;
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "invite", email });
  if (error) throw error;
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error: verifyError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "invite" });
    if (verifyError || !data.session) throw verifyError ?? new Error("Invitation session missing");
    const fragment = new URLSearchParams({ type: "invite", access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    await page.goto(`/reset-password#${fragment}`);
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
    await expect(page).toHaveURL("http://localhost:3003/reset-password");
  } finally {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(link.user.id);
    if (cleanupError) throw cleanupError;
  }
});
