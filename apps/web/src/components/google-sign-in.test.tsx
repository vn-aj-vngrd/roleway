import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/app/auth/google", () => ({ signInWithGoogle: vi.fn() }));
import { GoogleSignIn } from "./google-sign-in";

afterEach(() => vi.unstubAllEnvs());
it.each(["", "false", "TRUE"])(
  "hides the Google entry when flag is %s",
  (flag) => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", flag);
    expect(GoogleSignIn({})).toBeNull();
  },
);
