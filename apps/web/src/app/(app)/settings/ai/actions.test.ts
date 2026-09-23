import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  existing: null as null | { id: string; provider: string; model: string; base_url: string | null },
  values: {} as Record<string, unknown>, filters: [] as Array<[string, unknown]>, encrypt: vi.fn(), writes: 0,
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ requireUser: async () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/ai/secrets", () => ({ encryptSecret: state.encrypt, decryptSecret: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => {
  let writing = false;
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => { state.filters.push([column, value]); return query; },
    update: (values: Record<string, unknown>) => { writing = true; state.writes++; state.values = values; return query; },
    insert: (values: Record<string, unknown>) => { writing = true; state.writes++; state.values = values; return query; },
    maybeSingle: async () => ({ data: writing ? { id: "saved" } : state.existing, error: null }),
    single: async () => ({ data: { id: "saved" }, error: null }),
  };
  return query;
} }) }));
import { saveAiConnection } from "./actions";
const id = "11111111-1111-4111-8111-111111111111";
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ connectionId: id, provider: "openai", label: "Updated name", model: "fixture-model", baseUrl: "", apiKey: "", ...overrides })) data.set(key, value);
  return data;
}
beforeEach(() => {
  state.existing = { id, provider: "openai", model: "fixture-model", base_url: null };
  state.values = {}; state.filters = []; state.writes = 0;
  state.encrypt.mockReset().mockReturnValue({ encrypted: "encrypted-replacement", iv: "new-iv" });
});
describe("edit provider connections", () => {
  it("retains the key and verification on a name-only edit", async () => {
    await expect(saveAiConnection(form())).rejects.toThrow("updated=true");
    expect(state.values.label).toBe("Updated name");
    expect(state.values).not.toHaveProperty("status");
    expect(state.values).not.toHaveProperty("encrypted_secret");
    expect(state.encrypt).not.toHaveBeenCalled();
    expect(state.filters.filter(([column]) => column === "user_id")).toEqual([["user_id", "owner"], ["user_id", "owner"]]);
  });
  it("requires another verification after a model change", async () => {
    await expect(saveAiConnection(form({ model: "other-model" }))).rejects.toThrow("saved=true");
    expect(state.values).toMatchObject({ model: "other-model", status: "untested", last_error: null, last_tested_at: null });
    expect(state.encrypt).not.toHaveBeenCalled();
  });
  it("encrypts a replacement key without persisting plaintext", async () => {
    await expect(saveAiConnection(form({ apiKey: "replacement-key" }))).rejects.toThrow("saved=true");
    expect(state.values).toMatchObject({ encrypted_secret: "encrypted-replacement", secret_iv: "new-iv", key_hint: "••••-key", status: "untested" });
    expect(JSON.stringify(state.values)).not.toContain("replacement-key");
  });
  it("rejects another owner's or deleted connection", async () => {
    state.existing = null;
    await expect(saveAiConnection(form())).rejects.toThrow("Connection%20not%20found");
    expect(state.writes).toBe(0);
  });
  it("requires a new key before switching providers", async () => {
    await expect(saveAiConnection(form({ provider: "anthropic" }))).rejects.toThrow("Enter%20an%20API%20key");
    expect(state.writes).toBe(0);
  });
});
