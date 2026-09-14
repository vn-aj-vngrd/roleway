import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); auth.verifyOtp.mockResolvedValue({ error: null }); auth.exchangeCodeForSession.mockResolvedValue({ error: null }); });
it("keeps PKCE recovery links on the password form", async () => {
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?code=fixture&next=/reset-password"));
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("fixture");
  expect(response.headers.get("location")).toBe("https://roleway.example/reset-password");
});
it("verifies invitation links before opening password setup", async () => {
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?type=invite&token_hash=fixture&next=https://attacker.example"));
  expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "fixture" });
  expect(response.headers.get("location")).toBe("https://roleway.example/reset-password");
});
it("does not exchange an unsupported token type", async () => {
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?type=unsupported&token_hash=fixture"));
  expect(auth.verifyOtp).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toContain("/verify-email?error=");
});

it("confirms signup tokens across browsers and starts onboarding", async () => {
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?type=signup&token_hash=fixture"));
  expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "fixture" });
  expect(response.headers.get("location")).toBe("https://roleway.example/onboarding");
});
it("offers verification recovery for an expired signup link", async () => {
  auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?type=signup&token_hash=fixture"));
  expect(response.headers.get("location")).toContain("/verify-email?error=");
});
it("keeps verified email links on a safe local destination", async () => {
  const response = await GET(new NextRequest("https://roleway.example/auth/callback?type=email&token_hash=fixture&next=%2F%5C%5Cevil.example"));
  expect(response.headers.get("location")).toBe("https://roleway.example/home");
});
