import { beforeEach, expect, it, vi } from "vitest";
const reset = vi.hoisted(() => vi.fn());
const mocks = vi.hoisted(() => ({
  resend: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    auth: { resetPasswordForEmail: reset, ...mocks },
  }),
}));
import {
  requestPasswordReset,
  resendConfirmation,
  signUp,
  signIn,
} from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://roleway.example");
  reset.mockReset();
  mocks.rpc.mockResolvedValue({
    data: { acceptingSignups: true },
    error: null,
  });
});
it("does not claim delivery when the recovery provider rejects the request", async () => {
  reset.mockResolvedValue({ error: { code: "captcha_failed" } });
  const form = new FormData();
  form.set("email", "fixture@example.com");
  form.set("captchaToken", "fixture-token");
  await expect(requestPasswordReset(form)).rejects.toThrow(
    "/forgot-password?error=",
  );
});
it("acknowledges an accepted recovery request without revealing account existence", async () => {
  reset.mockResolvedValue({ error: null });
  const form = new FormData();
  form.set("email", "fixture@example.com");
  form.set("captchaToken", "fixture-token");
  await expect(requestPasswordReset(form)).rejects.toThrow(
    "/forgot-password?sent=true",
  );
});

function credentials() {
  const form = new FormData();
  form.set("email", "fixture@example.com");
  form.set("password", "Password123!");
  form.set("confirmPassword", "Password123!");
  form.set("captchaToken", "fixture-token");
  return form;
}
it("requires inbox verification after a confirmation-enabled signup", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  await expect(signUp(credentials())).rejects.toThrow(
    "/verify-email?sent=true",
  );
  expect(mocks.signUp).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo:
          "https://roleway.example/auth/callback?next=/onboarding",
      }),
    }),
  );
});
it("directs unconfirmed users to email verification", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    data: { user: null },
    error: { code: "email_not_confirmed" },
  });
  await expect(signIn(credentials())).rejects.toThrow("/verify-email?error=");
});
it("resends verification with captcha and the configured callback", async () => {
  mocks.resend.mockResolvedValue({ error: null });
  await expect(resendConfirmation(credentials())).rejects.toThrow(
    "/verify-email?sent=true",
  );
  expect(mocks.resend).toHaveBeenCalledWith({
    type: "signup",
    email: "fixture@example.com",
    options: {
      captchaToken: "fixture-token",
      emailRedirectTo: "https://roleway.example/auth/callback?next=/onboarding",
    },
  });
});
it("does not claim success when a resend is rejected", async () => {
  mocks.resend.mockResolvedValue({
    error: { code: "over_email_send_rate_limit" },
  });
  await expect(resendConfirmation(credentials())).rejects.toThrow(
    "/verify-email?error=",
  );
});

it.each([undefined, "", "Different password", "Password123! "])(
  "rejects invalid signup confirmation before contacting Supabase: %s",
  async (confirmation) => {
    const form = credentials();
    if (confirmation === undefined) form.delete("confirmPassword");
    else form.set("confirmPassword", confirmation);
    await expect(signUp(form)).rejects.toThrow("/signup?error=");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);
it("accepts a matching passphrase without trimming or forwarding confirmation", async () => {
  const form = credentials();
  const passphrase = " meadow lantern orbit river ";
  form.set("password", passphrase);
  form.set("confirmPassword", passphrase);
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  await expect(signUp(form)).rejects.toThrow("/verify-email?sent=true");
  expect(mocks.signUp).toHaveBeenCalledWith({
    email: "fixture@example.com",
    password: passphrase,
    options: {
      captchaToken: "fixture-token",
      emailRedirectTo: "https://roleway.example/auth/callback?next=/onboarding",
    },
  });
});
