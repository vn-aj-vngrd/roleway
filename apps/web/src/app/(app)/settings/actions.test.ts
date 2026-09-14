import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), remove: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { admin: { deleteUser: mocks.remove } } }) }));
vi.mock("@/lib/supabase/server", () => ({ requireUser: async () => ({
  user: { id: "fixture-id", email: "fixture@example.com", user_metadata: {} },
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { full_name: "Fixture User" } }) }) }) }), auth: { signInWithPassword: mocks.verify, signOut: mocks.signOut } },
}) }));
import { deleteAccount } from "./actions";
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ confirmationName: "Fixture User", confirmationEmail: "fixture@example.com", currentPassword: "fixture-password", captchaToken: "fixture-captcha-token" })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-key");
  mocks.remove.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ error: null });
});
it("passes security verification to password reauthentication before deleting", async () => {
  await expect(deleteAccount(form())).rejects.toThrow("/login?message=");
  expect(mocks.verify).toHaveBeenCalledWith({ email: "fixture@example.com", password: "fixture-password", options: { captchaToken: "fixture-captcha-token" } });
  expect(mocks.remove).toHaveBeenCalledWith("fixture-id");
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
it("keeps the account when CAPTCHA fails and reports the actual recovery action", async () => {
  mocks.verify.mockResolvedValue({ error: { code: "captcha_failed" } });
  await expect(deleteAccount(form())).rejects.toThrow("Security%20verification");
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("rejects mismatched identity before reauthentication", async () => {
  const data = form(); data.set("confirmationEmail", "another@example.com");
  await expect(deleteAccount(data)).rejects.toThrow("must%20match");
  expect(mocks.verify).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
