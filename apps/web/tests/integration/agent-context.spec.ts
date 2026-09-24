import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
import { createAgentReadContext } from "@/features/agent/read-context";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
let userId = "",
  workspaceId = "",
  opportunityId = "",
  documentId = "",
  conversationId = "";
let session: SupabaseClient;
const options = { toolCallId: "integration", messages: [], context: {} };
beforeAll(async () => {
  const email = `e2e-agent-context-${randomUUID()}@roleway.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) throw new Error("Fixture account could not be created");
  userId = created.data.user.id;
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (link.error) throw new Error("Fixture link unavailable");
  session = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const signed = await session.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.data.properties.hashed_token,
  });
  if (signed.error) throw new Error("Fixture authentication failed");
  const profile = await session
    .from("profiles")
    .select("active_project_id")
    .single();
  workspaceId = profile.data!.active_project_id;
  const owned = { user_id: userId, project_id: workspaceId };
  const job = await session
    .from("jobs")
    .insert({
      ...owned,
      title: "Context engineer",
      company: "Cedar fixture",
      description: "Build typed services",
    })
    .select("id")
    .single();
  expect(job.error).toBeNull();
  const opportunity = await session
    .from("opportunities")
    .insert({ ...owned, job_id: job.data!.id, stage: "interested" })
    .select("id")
    .single();
  expect(opportunity.error).toBeNull();
  opportunityId = opportunity.data!.id;
  const note = await session
    .from("opportunity_notes")
    .insert({
      user_id: userId,
      opportunity_id: opportunityId,
      body: "Recruiter wants accessibility examples",
    });
  expect(note.error).toBeNull();
  const document = await session
    .from("documents")
    .insert({
      ...owned,
      title: "Cedar evidence",
      kind: "resume",
      status: "approved",
      content: { body: "Shipped accessible TypeScript services" },
    })
    .select("id")
    .single();
  expect(document.error).toBeNull();
  documentId = document.data!.id;
  const conversation = await session
    .from("agent_conversations")
    .insert({ ...owned, title: "Context integration" })
    .select("id")
    .single();
  expect(conversation.error).toBeNull();
  conversationId = conversation.data!.id;
});
afterAll(async () => {
  if (userId) {
    const result = await admin.auth.admin.deleteUser(userId);
    expect(result.error).toBeNull();
  }
});
it("searches real joined records and retrieves source text with the authenticated session", async () => {
  const reader = createAgentReadContext({
    supabase: session,
    userId,
    workspaceIds: [workspaceId],
    conversationId,
  });
  const search = await reader.tools.search_records.execute!(
    { kind: "opportunities", query: "Cedar", offset: 0 },
    options,
  );
  expect(JSON.stringify(search)).toContain(opportunityId);
  const opportunity = await reader.tools.read_context.execute!(
    { kind: "opportunity", id: opportunityId, offset: 0 },
    options,
  );
  expect(JSON.stringify(opportunity)).toContain("Build typed services");
  expect(JSON.stringify(opportunity)).toContain(
    "Recruiter wants accessibility examples",
  );
  const document = await reader.tools.read_context.execute!(
    { kind: "document", id: documentId, offset: 0 },
    options,
  );
  expect(JSON.stringify(document)).toContain(
    "Shipped accessible TypeScript services",
  );
});
it("rejects known ids when the conversation scope excludes their Workspace", async () => {
  const reader = createAgentReadContext({
    supabase: session,
    userId,
    workspaceIds: [randomUUID()],
    conversationId,
  });
  for (const [kind, id] of [
    ["opportunity", opportunityId],
    ["document", documentId],
  ] as const) {
    const result = await reader.tools.read_context.execute!(
      { kind, id, offset: 0 },
      options,
    );
    expect(JSON.stringify(result)).toContain("unavailable");
    expect(JSON.stringify(result)).not.toContain("TypeScript");
  }
});
