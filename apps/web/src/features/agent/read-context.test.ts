import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { createAgentReadContext } from "./read-context";

const owner = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";
const record = "33333333-3333-4333-8333-333333333333";
let rows: Record<string, Array<Record<string, unknown>>>;
let reads: string[];
// Model database ownership filters, including the parent authorization for notes/events.
function client() {
  return {
    from(table: string) {
      reads.push(table);
      let values = rows[table] ?? [];
      const q = {
        select: () => q,
        order: () => q,
        or: () => q,
        ilike: () => q,
        eq: (key: string, value: unknown) => {
          values = values.filter((row) => row[key] === value);
          return q;
        },
        in: (key: string, options: unknown[]) => {
          values = values.filter((row) => options.includes(row[key]));
          return q;
        },
        range: (start: number, end: number) => {
          values = values.slice(start, end + 1);
          return q;
        },
        maybeSingle: async () => ({ data: values[0] ?? null, error: null }),
        then: (
          resolve: (result: { data: typeof values; error: null }) => unknown,
        ) => Promise.resolve({ data: values, error: null }).then(resolve),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}
const options = { toolCallId: "test", messages: [], context: {} };
function reader() {
  return createAgentReadContext({
    supabase: client(),
    userId: owner,
    workspaceIds: [workspace],
    conversationId: record,
  });
}
beforeEach(() => {
  rows = {};
  reads = [];
});

describe("Agent authenticated read tools", () => {
  it("does not read notes or activity for an Opportunity outside scope", async () => {
    rows.opportunities = [{ id: record, user_id: owner, project_id: "other" }];
    const result = await reader().tools.read_context.execute!(
      { kind: "opportunity", id: record, offset: 0 },
      options,
    );
    expect(result).toMatchObject({
      content: expect.stringContaining("unavailable"),
    });
    expect(reads).toEqual(["opportunities"]);
  });
  it("excludes another owner's document even when its id is known", async () => {
    rows.documents = [
      {
        id: record,
        user_id: "other",
        project_id: workspace,
        content: { body: "private" },
      },
    ];
    const result = await reader().tools.read_context.execute!(
      { kind: "document", id: record, offset: 0 },
      options,
    );
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result).toMatchObject({
      content: expect.stringContaining("unavailable"),
    });
  });
  it("retrieves bounded document source text and approval status", async () => {
    rows.documents = [
      {
        id: record,
        user_id: owner,
        project_id: workspace,
        status: "approved",
        content: { body: "<p>Shipped TypeScript</p><script>bad()</script>" },
      },
    ];
    const result = await reader().tools.read_context.execute!(
      { kind: "document", id: record, offset: 0 },
      options,
    );
    expect(result).toMatchObject({
      content: expect.stringContaining("Shipped TypeScript"),
    });
    expect(JSON.stringify(result)).not.toContain("<script>");
    expect(JSON.stringify(result)).toContain("approved");
  });
  it("loads notes and activity through the authorized parent and remembers proposal targets", async () => {
    rows.opportunities = [
      {
        id: record,
        user_id: owner,
        project_id: workspace,
        stage: "interested",
        jobs: { description: "<p>Build services</p>" },
      },
    ];
    rows.opportunity_notes = [
      {
        id: "note",
        user_id: owner,
        opportunity_id: record,
        body: "Recruiter context",
      },
    ];
    rows.opportunity_events = [
      {
        id: "event",
        user_id: owner,
        opportunity_id: record,
        event_type: "application_submitted",
      },
    ];
    const context = reader();
    const result = await context.tools.read_context.execute!(
      { kind: "opportunity", id: record, offset: 0 },
      options,
    );
    expect(JSON.stringify(result)).toContain("Recruiter context");
    expect(JSON.stringify(result)).toContain("application_submitted");
    expect(context.opportunities.has(record)).toBe(true);
  });
  it("paginates earlier messages only within this conversation", async () => {
    rows.agent_messages = [
      ...Array.from({ length: 25 }, (_, i) => ({
        id: String(i),
        user_id: owner,
        conversation_id: record,
        role: "user",
        content: `Fact ${i}`,
      })),
      {
        user_id: owner,
        conversation_id: "other",
        content: "private conversation",
      },
    ];
    const result = await reader().tools.read_context.execute!(
      { kind: "conversation", id: null, offset: 12 },
      options,
    );
    expect(JSON.stringify(result)).toContain("Fact 12");
    expect(JSON.stringify(result)).not.toContain("Fact 0");
    expect(JSON.stringify(result)).not.toContain("private conversation");
    expect(result).toMatchObject({
      content: expect.stringContaining('"nextOffset":24'),
    });
  });
  it("caps parallel reads, including a subsequent answer repair", async () => {
    const context = reader();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        context.tools.search_records.execute!(
          { kind: "documents", query: "", offset: 0 },
          options,
        ),
      ),
    );
    expect(reads).toHaveLength(6);
    expect(results[6]).toMatchObject({
      error: expect.stringContaining("limit"),
    });
  });
});
