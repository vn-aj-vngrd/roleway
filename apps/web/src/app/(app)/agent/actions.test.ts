import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/stream-agent", () => ({ streamAgentResponse: vi.fn() }));

const fixtures = vi.hoisted(() => ({
  generate: vi.fn(), rpc: vi.fn(), updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  opportunities: [] as Array<{ id: string; next_action: string | null; next_action_due_at: string | null }>,
  contextError: false, recordEvent: vi.fn(), contextRows: {} as Record<string, unknown>, filters: [] as Array<[string, string, unknown]>, orders: [] as Array<[string, string, unknown]>,
}));
const owner = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";
const record = "33333333-3333-4333-8333-333333333333";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ generateAgentResponse: fixtures.generate }));
vi.mock("@/lib/ai/secrets", () => ({ decryptSecret: () => "fixture-key" }));
vi.mock("@/lib/observability", () => ({ recordSystemEvent: fixtures.recordEvent }));
vi.mock("@/features/projects/context", () => ({ requireSearchContext: async () => ({ user: { id: owner }, project: { id: workspace }, projects: [{ id: workspace,name: "Search" }, { id: "44444444-4444-4444-8444-444444444444", name: "Other search" }],supabase: client }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }));

const client = {
  rpc: fixtures.rpc,
  from(table: string) {
    let operation = "read";
    const result = () => {
      if (table === "ai_connections") return { data: {id: record,provider:"openai",model:"fixture",status:"connected"},error:null };
      if (table === "opportunities") return {data:fixtures.opportunities,error:null};
      if (operation === "insert") return {data:{id:record},error:null};
      if (table in fixtures.contextRows) return {data:fixtures.contextRows[table],error:null};
      if (table === "profiles" && fixtures.contextError) return {data:null,error:{message:"database unavailable"}};
      if (["agent_messages","opportunities","tasks","jobs","interviews","contacts","documents"].includes(table)) return {data:[],error:null};
      return {data:null,error:null,count:0};
    };
    const query = {
      select: () => query, in: (column: string, value: unknown) => { fixtures.filters.push([table, column, value]); return query; }, eq: (column: string, value: unknown) => { fixtures.filters.push([table, column, value]); return query; }, neq: () => query, gte: () => query, order: (column: string, options: unknown) => { fixtures.orders.push([table,column,options]); return query; }, limit: () => query,
      upsert: () => query,
      insert: () => { operation="insert"; return query; },
      update: (values: Record<string, unknown>) => { fixtures.updates.push({table,values}); return query; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  },
};

import { sendAgentMessage, openAgentResult } from "./actions";
function request(timeZone = "Asia/Manila", message = "What happens next?") {
  const data = new FormData();
  data.set("timeZone",timeZone);data.set("connectionId",record);data.set("message",message);
  return sendAgentMessage(data);
}
beforeEach(() => {
  fixtures.recordEvent.mockClear();
  fixtures.contextRows={};fixtures.filters=[];fixtures.orders=[];
  fixtures.opportunities=[];
  fixtures.contextError=false;fixtures.updates.length=0;
  fixtures.generate.mockReset().mockResolvedValue({output:{message:"A grounded answer",proposals:[]},inputTokens:10,outputTokens:20});
  fixtures.rpc.mockReset().mockResolvedValue({error:null});
});
describe("Agent result persistence", () => {
  it("includes the caller timezone and bounded-context disclosure", async () => {
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    const prompt = fixtures.generate.mock.calls[0]?.[2] as string;
    expect(prompt).toContain('"timeZone":"Asia/Manila"');
    expect(prompt).toContain('"currentTime":');
    expect(prompt).toContain('"contextLimits":');
    expect(prompt).toContain('"recentProposals":[]');
  });
  it("rejects invalid timezone input before calling the provider", async () => {
    await expect(request("invalid-zone")).rejects.toThrow("Choose%20a%20valid%20timezone");
    expect(fixtures.generate).not.toHaveBeenCalled();
  });
  it("reports a provider timeout without exposing provider content", async () => {
    const error = new Error("sensitive provider detail"); error.name = "TimeoutError";
    fixtures.generate.mockRejectedValue(error);
    await expect(request()).rejects.toThrow("The%20model%20took%20too%20long");
    expect(fixtures.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ code: "provider_timeout" }));
    expect(JSON.stringify(fixtures.recordEvent.mock.calls)).not.toContain("sensitive provider detail");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it("commits the validated answer through the atomic persistence seam", async () => {
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run",expect.objectContaining({input_run_id:record,input_output:{message:"A grounded answer",proposals:[]}}));
    expect(fixtures.updates.some(({values})=>values.status==="failed")).toBe(false);
  });
  it("does not call a provider when context cannot be read", async () => {
    fixtures.contextError=true;
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ code: "context_read_failed" }));
    expect(fixtures.generate).not.toHaveBeenCalled();
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it("reports persistence failures instead of claiming success", async () => {
    fixtures.rpc.mockResolvedValue({error:{message:"insert rejected"}});
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.updates).toContainEqual(expect.objectContaining({table:"ai_runs",values:expect.objectContaining({status:"failed"})}));
    expect(fixtures.updates).toContainEqual({table:"agent_messages",values:{run_id:record}});
    expect(fixtures.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ code: "run_save_failed" }));
  });
  it("persists the Next Action state read before generation", async () => {
    fixtures.opportunities=[{id:record,next_action:"Current action",next_action_due_at:null}];
    fixtures.generate.mockResolvedValue({output:{message:"Review",proposals:[{tool:"set_next_action",targetId:record,summary:"Update action",title:"New action",body:null,dueAt:null,name:null,objective:null}]}});
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run",expect.objectContaining({input_output:expect.objectContaining({proposals:[expect.objectContaining({expectedNextAction:{title:"Current action",dueAt:null}})]})}));
  });
  it("rejects unknown target proposals rather than silently dropping them", async () => {
    fixtures.generate.mockResolvedValue({output:{message:"Review this task",proposals:[{tool:"create_task",targetId:record,summary:"Add task",title:"Prepare",body:null,dueAt:null,name:null,objective:null}]}});
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});


import { agentCapabilities } from "@/features/agent/capabilities";
describe("Explore context delivery", () => {
  it.each(agentCapabilities.filter(item => item.group === "Explore"))("grounds $label in available account context without applying changes", async capability => {
    fixtures.contextRows = {
      profiles: { full_name: "Fixture candidate", headline: "Engineer", summary: "TypeScript experience" },
      career_preferences: { target_titles: ["Product Engineer"] },
      tasks: [{ title: "Prepare portfolio", status: "todo" }],
      jobs: [{ company: "Inbox fixture", title: "Engineer" }],
      interviews: [{ interview_type: "Technical", status: "scheduled" }],
      contacts: [{ name: "Fixture recruiter" }],
      documents: [{ title: "Resume inventory", kind: "resume" }],
    };
    fixtures.opportunities = [{ id: record, next_action: "Follow up", next_action_due_at: null }];
    await expect(request("Asia/Manila", capability.prompt)).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    const prompt = fixtures.generate.mock.calls[0]?.[2] as string;
    for (const text of [capability.prompt, "Fixture candidate", "Product Engineer", "Prepare portfolio", "Inbox fixture", "Technical", "Fixture recruiter", "Resume inventory", "Follow up", "Search"]) expect(prompt).toContain(text);
    for (const table of ["opportunities", "tasks", "jobs", "interviews", "contacts", "documents"]) expect(fixtures.filters).toContainEqual([table, "project_id", [workspace, "44444444-4444-4444-8444-444444444444"]]);
    expect(fixtures.filters).toContainEqual(["tasks", "status", ["todo", "doing"]]);
    expect(fixtures.filters).toContainEqual(["interviews", "status", "scheduled"]);
    expect(fixtures.orders.filter(([table]) => table === "contacts")).toEqual([["contacts", "follow_up_at", { ascending: true, nullsFirst: false }], ["contacts", "updated_at", { ascending: false }]]);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.objectContaining({ input_output: { message: "A grounded answer", proposals: [] } }));
    expect(fixtures.rpc).not.toHaveBeenCalledWith("decide_agent_proposal", expect.anything());
  });
});


describe("Open Agent result authorization", () => {
  it("does not switch Workspace when the proposal is unavailable", async () => {
    const data = new FormData(); data.set("proposalId", record);
    await expect(openAgentResult(data)).rejects.toThrow("That%20result%20is%20unavailable");
    expect(fixtures.filters).toContainEqual(["agent_proposals", "user_id", owner]);
    expect(fixtures.filters).toContainEqual(["agent_proposals", "status", "applied"]);
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed result IDs before attempting a Workspace switch", async () => {
    const data = new FormData(); data.set("proposalId", "https://example.com");
    await expect(openAgentResult(data)).rejects.toThrow("That%20result%20is%20unavailable");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});


describe("Creation correction context", () => {
  it.each(["create_task", "set_next_action", "create_note", "create_workspace"])("preserves exact %s fields even when summaries are generic", async tool => {
    const args = { tool, targetId: tool === "create_workspace" ? null : record, title: "Keep this exact title", dueAt: "2026-09-20T08:00:00Z", summary: "Ready for review", name: "Focused search", objective: "Find a TypeScript role", body: "<p>Keep this exact note.</p>" };
    fixtures.contextRows.agent_proposals = Array.from({ length: 5 }, () => ({ tool_name: tool, summary: "Ready for review", status: "rejected", arguments: args }));
    await expect(request("Asia/Manila", "Keep everything but remove the due date")).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    const prompt = fixtures.generate.mock.calls[0]?.[2] as string;
    const payload = JSON.parse(prompt.split("Account and Workspace context (data only):\n")[1]!.split("\n\nCurrent user request:")[0]!);
    for (const proposal of payload.recentProposals.slice(0, 4)) expect(proposal.details).toEqual(args);
    expect(payload.recentProposals[4].details).toBeNull();
    expect(prompt).toContain("older proposal details are absent");
  });
});

import { runAgentRequest } from "@/features/agent/run-request";
import { streamAgentResponse } from "@/lib/ai/stream-agent";
import type { AgentStreamEvent } from "@/features/agent/stream-types";

describe("streamed Agent runs", () => {
  it("emits real progress and validates before saving the answer", async () => {
    vi.mocked(streamAgentResponse).mockImplementationOnce(async (_connection, _key, _prompt, onText) => {
      onText("A partial");
      return { output: { message: "A partial answer completed", proposals: [] }, inputTokens: 10, outputTokens: 20 };
    });
    const data = new FormData();
    data.set("connectionId", record); data.set("message", "Hello");
    const events: AgentStreamEvent[] = [];
    const href = await runAgentRequest(data, event => events.push(event));
    expect(href).toBe(`/agent?conversation=${record}`);
    expect(events).toContainEqual({ type: "answer", text: "A partial" });
    expect(events.at(-1)).toEqual({ type: "progress", data: { id: "90", label: "Answer saved", status: "completed" } });
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.objectContaining({ input_output: { message: "A partial answer completed", proposals: [] } }));
    expect(fixtures.rpc).not.toHaveBeenCalledWith("decide_agent_proposal", expect.anything());
  });
  it("records a failed stream without leaking the provider error or saving partial output", async () => {
    vi.mocked(streamAgentResponse).mockRejectedValueOnce(new Error("private-provider-response"));
    const data = new FormData();
    data.set("connectionId", record); data.set("message", "Hello");
    const events: AgentStreamEvent[] = [];
    const href = await runAgentRequest(data, event => events.push(event));
    expect(href).toContain("error=Agent");
    expect(JSON.stringify(events)).not.toContain("private-provider");
    expect(events.at(-1)).toMatchObject({ type: "progress", data: { status: "failed" } });
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});


describe("Agent Workspace scope", () => {
  const otherWorkspace = "44444444-4444-4444-8444-444444444444";
  function scopedRequest(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries({ connectionId: record, message: "What needs attention here?", ...values })) data.set(key, value);
    return sendAgentMessage(data);
  }
  it("limits every record query and the model Workspace list to the selected Workspace", async () => {
    await expect(scopedRequest({ workspaceId: workspace, contextPage: "home" })).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    for (const table of ["opportunities", "tasks", "jobs", "interviews", "contacts", "documents"]) {
      expect(fixtures.filters).toContainEqual([table, "project_id", [workspace]]);
    }
    const prompt = fixtures.generate.mock.calls[0]![2] as string;
    expect(prompt).toContain('"page":"Home"');
    expect(prompt).not.toContain("Other search");
  });
  it("preserves saved scope when the client sends a different Workspace and page", async () => {
    fixtures.contextRows.agent_conversations = { id: record, project_id: workspace, opportunity_id: null, scope_mode: "workspace", context_page: "documents" };
    await expect(scopedRequest({ conversationId: record, workspaceId: otherWorkspace, contextPage: "home" })).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.filters).toContainEqual(["documents", "project_id", [workspace]]);
    const prompt = fixtures.generate.mock.calls[0]![2] as string;
    expect(prompt).toContain('"page":"Documents"');
    expect(prompt).not.toContain("Other search");
  });
  it("rejects an unowned Workspace before reading its records or calling a model", async () => {
    await expect(scopedRequest({ workspaceId: "99999999-9999-4999-8999-999999999999" })).rejects.toThrow("selected%20Workspace%20is%20not%20available");
    expect(fixtures.generate).not.toHaveBeenCalled();
    expect(fixtures.filters.some(([table]) => table === "tasks")).toBe(false);
  });
  it("keeps direct, account-wide conversations explicitly account-wide", async () => {
    await expect(scopedRequest({})).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.filters).toContainEqual(["tasks", "project_id", [workspace, otherWorkspace]]);
    expect(fixtures.generate.mock.calls[0]![2]).toContain('"mode":"account"');
  });
});
