import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
const profile = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth,
    from: () => ({ select: () => ({ eq: () => profile }) }),
  }),
}));
import { GET } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});
it("keeps PKCE recovery links on the password form", async () => {
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?code=fixture&next=/reset-password",
    ),
  );
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("fixture");
  expect(response.headers.get("location")).toBe(
    "https://roleway.example/reset-password",
  );
});
it("verifies invitation links before opening password setup", async () => {
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?type=invite&token_hash=fixture&next=https://attacker.example",
    ),
  );
  expect(auth.verifyOtp).toHaveBeenCalledWith({
    type: "invite",
    token_hash: "fixture",
  });
  expect(response.headers.get("location")).toBe(
    "https://roleway.example/reset-password",
  );
});
it("does not exchange an unsupported token type", async () => {
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?type=unsupported&token_hash=fixture",
    ),
  );
  expect(auth.verifyOtp).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toContain("/verify-email?error=");
});

it("confirms signup tokens across browsers and starts onboarding", async () => {
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?type=signup&token_hash=fixture",
    ),
  );
  expect(auth.verifyOtp).toHaveBeenCalledWith({
    type: "signup",
    token_hash: "fixture",
  });
  expect(response.headers.get("location")).toBe(
    "https://roleway.example/onboarding",
  );
});
it("offers verification recovery for an expired signup link", async () => {
  auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?type=signup&token_hash=fixture",
    ),
  );
  expect(response.headers.get("location")).toContain("/verify-email?error=");
});
it("keeps verified email links on a safe local destination", async () => {
  const response = await GET(
    new NextRequest(
      "https://roleway.example/auth/callback?type=email&token_hash=fixture&next=%2F%5C%5Cevil.example",
    ),
  );
  expect(response.headers.get("location")).toBe("https://roleway.example/home");
});

function googleRequest(query = "code=fixture", next = "/settings/profile") {
  return new NextRequest(
    `https://roleway.example/auth/callback?provider=google&${query}`,
    { headers: { cookie: `roleway_google_next=${encodeURIComponent(next)}` } },
  );
}
it("routes new Google accounts to onboarding and clears the destination cookie", async () => {
  auth.getUser.mockResolvedValue({
    data: { user: { id: "user-id" } },
    error: null,
  });
  profile.maybeSingle.mockResolvedValue({
    data: { onboarding_completed: false },
    error: null,
  });
  const response = await GET(googleRequest());
  expect(response.headers.get("location")).toBe(
    "https://roleway.example/onboarding",
  );
  expect(response.cookies.get("roleway_google_next")?.value).toBe("");
});
it("returns existing Google users to a safe destination", async () => {
  auth.getUser.mockResolvedValue({
    data: { user: { id: "user-id" } },
    error: null,
  });
  profile.maybeSingle.mockResolvedValue({
    data: { onboarding_completed: true },
    error: null,
  });
  expect((await GET(googleRequest())).headers.get("location")).toBe(
    "https://roleway.example/settings/profile",
  );
  expect(
    (await GET(googleRequest("code=fixture", "//evil.example"))).headers.get(
      "location",
    ),
  ).toBe("https://roleway.example/home");
});
it("handles Google cancellation without exchanging a code or exposing provider details", async () => {
  const response = await GET(
    googleRequest("error=access_denied&error_description=private-details"),
  );
  const url = new URL(response.headers.get("location")!);
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("error")).toContain("canceled");
  expect(url.href).not.toContain("private-details");
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
it.each(["", "code=expired"])(
  "offers email fallback for incomplete Google callback %s",
  async (query) => {
    auth.exchangeCodeForSession.mockResolvedValue({
      error: { code: "invalid_code" },
    });
    const response = await GET(googleRequest(query));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    expect(response.cookies.get("roleway_google_next")?.value).toBe("");
  },
);
it("does not route an unverified session to a private destination", async () => {
  auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { code: "bad_jwt" },
  });
  expect(
    new URL((await GET(googleRequest())).headers.get("location")!).pathname,
  ).toBe("/login");
});
it("signs out when profile lookup fails so retry stays accessible", async () => {
  auth.getUser.mockResolvedValue({
    data: { user: { id: "user-id" } },
    error: null,
  });
  profile.maybeSingle.mockResolvedValue({
    data: null,
    error: { code: "unavailable" },
  });
  expect(
    new URL((await GET(googleRequest())).headers.get("location")!).pathname,
  ).toBe("/login");
  expect(auth.signOut).toHaveBeenCalled();
});
