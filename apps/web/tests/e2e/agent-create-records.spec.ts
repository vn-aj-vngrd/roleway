import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

test("Agent approves interviews and contacts with exact details and verified Open actions", async ({ page }) => {
  test.setTimeout(240_000);
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let userId = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    userId = await createFixtureAccount(`e2e-agent-records-${Date.now()}@roleway.test`, `Rw!${randomBytes(12).toString("hex")}`, page);
    const profile = await admin.from("profiles").update({ onboarding_completed: true, tour_completed: true }).eq("user_id", userId).select("active_project_id").single();
    if (profile.error) throw profile.error;
    const ownership = { user_id: userId, project_id: profile.data.active_project_id };
    const job = await admin.from("jobs").insert({ ...ownership, company: "Record fixture", title: "Engineer" }).select("id").single();
    if (job.error) throw job.error;
    const opportunity = await admin.from("opportunities").insert({ ...ownership, job_id: job.data.id, stage: "applied" }).select("id").single();
    if (opportunity.error) throw opportunity.error;
    const conversation = await admin.from("agent_conversations").insert({ ...ownership, title: "Interview and contact proposals" }).select("id").single();
    if (conversation.error) throw conversation.error;
    const connection = await admin.from("ai_connections").insert({ user_id: userId, provider: "openai", label: "Fixture", model: "fixture", encrypted_secret: "fixture", secret_iv: "fixture", key_hint: "fixture", status: "connected" }).select("id").single();
    if (connection.error) throw connection.error;
    const cases = [
      { tool: "create_interview", title: "Technical", targetId: opportunity.data.id, interview: { interviewType: "Technical", startsAt: "2027-01-15T14:00:00+08:00", timezone: "Asia/Manila", durationMinutes: 60, meetingUrl: "https://example.com/meeting", interviewers: "Hiring team" }, contact: null, success: "Interview created", open: "Open interview" },
      { tool: "create_contact", title: "Jane Recruiter", targetId: opportunity.data.id, interview: null, contact: { name: "Jane Recruiter", relationship: "recruiter", role: "Talent partner", company: "Record fixture", email: "jane@example.com", phone: null, profileUrl: null, notes: "Discussed the role", followUpAt: "2027-01-14T06:00:00Z" }, success: "Contact created", open: "Open contact" },
      { tool: "create_contact", title: "Alex Network", targetId: null, interview: null, contact: { name: "Alex Network", relationship: "contact", role: null, company: null, email: "alex@example.com", phone: null, profileUrl: null, notes: null, followUpAt: null }, success: "Contact created", open: "Open contact" },
    ];
    for (const [index, entry] of cases.entries()) {
      const run = await admin.from("ai_runs").insert({ ...ownership, conversation_id: conversation.data.id, task_type: "conversation", provider: "openai", model: "fixture", status: "generating" }).select("id").single();
      if (run.error) throw run.error;
      const complete = await admin.rpc("complete_agent_run", { input_run_id: run.data.id, input_tokens: 1, output_tokens: 1, input_output: { message: `Review ${entry.title}`, proposals: [{ tool: entry.tool, targetId: entry.targetId, workspaceId: ownership.project_id, interview: entry.interview, contact: entry.contact, summary: `Create ${entry.title}`, name: null, objective: null, title: null, body: null, dueAt: null }] } });
      if (complete.error) throw complete.error;
      const proposal = await admin.from("agent_proposals").select("id").eq("run_id", run.data.id).single();
      if (proposal.error) throw proposal.error;
      await page.goto(`/agent?conversation=${conversation.data.id}`);
      const card = page.locator(`#proposal-${proposal.data.id}`);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          await expect(card).toContainText(entry.title);
          if (entry.interview) {
            await expect(card).toContainText("Asia/Manila");
            await expect(card).toContainText("60 minutes");
            await expect(card).toContainText("No calendar invite");
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await card.screenshot({ path: `/tmp/roleway-agent-record-${index}-${width}-${theme}.png` });
        }
      }
      await card.getByRole("button", { name: "Approve change", exact: true }).click();
      await expect(card).toContainText(entry.success);
      await page.reload();
      await expect(card).toContainText(entry.success);
      await card.getByRole("button", { name: entry.open, exact: true }).click();
      if (entry.interview) await expect(page).toHaveURL(/\/interview\/[0-9a-f-]+/);
      else {
        await expect(page).toHaveURL(/\/contacts\?edit=/);
        await expect(page.getByRole("dialog", { name: `Edit ${entry.title}` }).getByLabel("Name", { exact: true })).toHaveValue(entry.title);
      }
    }
    expect((await admin.from("interviews").select("id").eq("user_id", userId)).data).toHaveLength(1);
    expect((await admin.from("contacts").select("id").eq("user_id", userId)).data).toHaveLength(2);
    expect((await admin.from("tasks").select("id").eq("user_id", userId).eq("category", "interview")).data).toHaveLength(1);
    await page.goto("/agent");
    const input = page.getByLabel("Message Roleway Agent", { exact: true });
    for (const term of ["Interview", "Contact"]) {
      await input.fill(`/${term}`);
      await expect(page.getByRole("listbox", { name: "Agent actions" }).getByRole("option").first()).toContainText(term);
      await input.press("Enter");
      await expect(input).toHaveValue(new RegExp(`Help me create an? ${term.toLowerCase()}`));
    }
    await page.goto("/help/agent-create");
    await expect(page.getByRole("heading", { name: "Create an interview", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create a contact", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  }
});
