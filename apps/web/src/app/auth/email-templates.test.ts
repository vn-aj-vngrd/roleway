import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "../..");
const templates = ["confirmation", "recovery", "invite", "magic-link", "email-change", "reauthentication", "password-changed", "email-changed"];
describe("Roleway auth-email contract", () => {
  it.each(templates)("keeps %s branded and registered", name => {
    const html = readFileSync(resolve(root, `supabase/templates/${name}.html`), "utf8");
    expect(html).toContain("Roleway");
    expect(html).toContain("One focused search. One clear next step.");
    expect(html).not.toMatch(/Relay|powered by supabase/i);
    if (["confirmation", "recovery", "invite", "magic-link", "email-change"].includes(name)) {
      expect(html).toContain("{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=");
      expect(html).toContain("can only be used once");
    }
    if (name === "reauthentication") expect(html).toContain("{{ .Token }}");
    const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
    const directory = ["password-changed", "email-changed"].includes(name) ? "./templates" : "./supabase/templates";
    expect(config).toContain(`content_path = "${directory}/${name}.html"`);
    expect(existsSync(resolve(root, `supabase/templates/${name}.html`))).toBe(true);
  });
});
