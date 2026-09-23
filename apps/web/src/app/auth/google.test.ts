import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ oauth: vi.fn(), set: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOAuth: mocks.oauth } }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
import { signInWithGoogle } from "./google";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://roleway.example/");
  mocks.oauth.mockResolvedValue({
    data: { url: "https://provider.example/authorize" },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
it("starts Google PKCE and stores a short-lived safe destination", async () => {
  const data = new FormData();
  data.set("next", "/settings/profile");
  await expect(signInWithGoogle(data)).rejects.toThrow(
    "https://provider.example/authorize",
  );
  expect(mocks.oauth).toHaveBeenCalledWith({
    provider: "google",
    options: {
      redirectTo: "https://roleway.example/auth/callback?provider=google",
    },
  });
  expect(mocks.set).toHaveBeenCalledWith(
    "roleway_google_next",
    "/settings/profile",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    }),
  );
});
it.each(["false", "", "TRUE"])(
  "blocks direct invocation when flag is %s",
  async (flag) => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", flag);
    await expect(signInWithGoogle(new FormData())).rejects.toThrow("/login?");
    expect(mocks.oauth).not.toHaveBeenCalled();
  },
);
it("rejects external destinations", async () => {
  const data = new FormData();
  data.set("next", "//evil.example");
  await expect(signInWithGoogle(data)).rejects.toThrow(
    "https://provider.example/authorize",
  );
  expect(mocks.set).toHaveBeenCalledWith(
    "roleway_google_next",
    "/home",
    expect.any(Object),
  );
});
it("returns recoverable fixed copy when provider setup fails", async () => {
  mocks.oauth.mockResolvedValue({
    data: { url: null },
    error: { message: "sensitive provider details" },
  });
  await expect(signInWithGoogle(new FormData())).rejects.toThrow(
    "Google+sign-in+could+not+start",
  );
  expect(mocks.set).not.toHaveBeenCalled();
});
it("does not invoke provider without a configured app URL", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  await expect(signInWithGoogle(new FormData())).rejects.toThrow("/login?");
  expect(mocks.oauth).not.toHaveBeenCalled();
});
