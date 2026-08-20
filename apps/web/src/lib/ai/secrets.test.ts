import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./secrets";

afterEach(() => vi.unstubAllEnvs());

describe("AI credential encryption", () => {
  it("round-trips without storing plaintext", () => {
    vi.stubEnv("AI_CREDENTIAL_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const secret = "sk-private-example";
    const encrypted = encryptSecret(secret);
    expect(encrypted.encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted.encrypted, encrypted.iv)).toBe(secret);
  });
});
