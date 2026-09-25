import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/stream-agent", () => ({ streamAgentResponse: vi.fn() }));

const fixtures = vi.hoisted(() => ({
  generate: vi.fn(), rpc: vi.fn(), updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  opportunities: [] as Array<{ id: string; project_id?: string; next_action: string | null; next_action_due_at: string | null }>,
  focused: null as Record<string, unknown> | null, contextError: false, recordEvent: vi.fn(), contextRows: {} as Record<string, unknown>, filters: [] as Array<[string, string, unknown]>, orders: [] as Array<[string, string, unknown]>,
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
      single: async () => result(), maybeSingle: async () => table === "opportunities" ? { data: fixtures.focused, error: null } : result(),
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
  vi.mocked(streamAgentResponse).mockReset();
  fixtures.recordEvent.mockClear();
  fixtures.contextRows={};fixtures.filters=[];fixtures.orders=[];
  fixtures.opportunities=[];fixtures.focused=null;
  fixtures.contextError=false;fixtures.updates.length=0;
  fixtures.generate.mockReset().mockResolvedValue({output:{message:"A grounded answer",proposals:[]},inputTokens:10,outputTokens:20});
  fixtures.rpc.mockReset().mockResolvedValue({error:null});
});
describe("Agent result persistence", () => {
  it("retries an introduction-only answer once and saves only the complete answer with combined usage", async () => {
    fixtures.generate.mockResolvedValueOnce({ output: { message: "Hey! Here is a snapshot of your job search:", proposals: [] }, inputTokens: 12, outputTokens: 8 });
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.generate).toHaveBeenCalledTimes(2);
    expect(fixtures.generate.mock.calls[1]?.[2]).toContain("complete, self-contained response");
    expect(fixtures.generate.mock.calls[0]?.[3]).toBeInstanceOf(AbortSignal);
    expect(fixtures.generate.mock.calls[1]?.[3]).toBe(fixtures.generate.mock.calls[0]?.[3]);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.objectContaining({ input_output: { message: "A grounded answer", proposals: [] }, input_tokens: 22, output_tokens: 28 }));
  });
  it("fails safely if the retry is also only an introduction", async () => {
    fixtures.generate.mockResolvedValue({ output: { message: "Here is your summary:", proposals: [] } });
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.generate).toHaveBeenCalledTimes(2);
    expect(fixtures.rpc).not.toHaveBeenCalled();
    expect(fixtures.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_provider_output" }));
  });
  it.each(["Hey! How can I help?", "What would you like to name the Workspace?", "Here is your summary:\n\n- No active tasks."])("keeps complete replies without retrying: %s", async message => {
    fixtures.generate.mockResolvedValue({ output: { message, proposals: [] } });
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.generate).toHaveBeenCalledTimes(1);
  });
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
  it.each(["create_task", "set_next_action", "create_note", "create_workspace", "create_interview", "create_contact"])("preserves exact %s fields even when summaries are generic", async tool => {
    const args = { ...(tool === "create_interview" ? { interview: interviewDetails } : tool === "create_contact" ? { workspaceId: workspace, contact: contactDetails } : {}), tool, targetId: tool === "create_workspace" ? null : record, title: "Keep this exact title", dueAt: "2026-09-20T08:00:00Z", summary: "Ready for review", name: "Focused search", objective: "Find a TypeScript role", body: "<p>Keep this exact note.</p>" };
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
  it("replaces an unfinished streamed introduction with the complete retry", async () => {
    vi.mocked(streamAgentResponse)
      .mockImplementationOnce(async (_connection, _key, _prompt, onText) => {
        onText("Here is your snapshot:");
        return { output: { message: "Here is your snapshot:", proposals: [] }, inputTokens: 10, outputTokens: 5 };
      })
      .mockImplementationOnce(async (_connection, _key, _prompt, onText) => {
        onText("Hey! How can I help?");
        return { output: { message: "Hey! How can I help?", proposals: [] }, inputTokens: 10, outputTokens: 8 };
      });
    const data = new FormData();
    data.set("connectionId", record); data.set("message", "hey");
    const events: AgentStreamEvent[] = [];
    expect(await runAgentRequest(data, event => events.push(event))).toBe(`/agent?conversation=${record}`);
    expect(events.filter(event => event.type === "answer")).toEqual([
      { type: "answer", text: "Here is your snapshot:" },
      { type: "answer", text: "" },
      { type: "answer", text: "Hey! How can I help?" },
    ]);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.objectContaining({ input_output: { message: "Hey! How can I help?", proposals: [] }, input_tokens: 20, output_tokens: 13 }));
    expect(vi.mocked(streamAgentResponse).mock.calls[1]?.[4]).toBe(vi.mocked(streamAgentResponse).mock.calls[0]?.[4]);
  });
  it("does not retry an incomplete answer after cancellation", async () => {
    const controller = new AbortController();
    vi.mocked(streamAgentResponse).mockImplementationOnce(async () => {
      controller.abort();
      return { output: { message: "Here is your snapshot:", proposals: [] }, inputTokens: 10, outputTokens: 5 };
    });
    const data = new FormData();
    data.set("connectionId", record); data.set("message", "hey");
    expect(await runAgentRequest(data, () => {}, controller.signal)).toContain("error=Agent");
    expect(streamAgentResponse).toHaveBeenCalledTimes(1);
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
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


describe("Focused context and explicit revisions", () => {
  it("loads a selected Opportunity outside the 100-record snapshot", async () => {
    fixtures.focused = { id: record, project_id: workspace, stage: "interested", next_action: null, next_action_due_at: null, jobs: {company: "Older company", title: "Engineer", description: "Unique focused source"} };
    fixtures.opportunities = [];
    fixtures.generate.mockResolvedValueOnce({output:{message:"Review",proposals:[{tool:"create_task",summary:"Prepare",targetId:record,title:"Prepare",body:null,dueAt:null,name:null,objective:null}]}});
    const data = new FormData(); data.set("connectionId",record); data.set("opportunityId",record); data.set("message","Prepare a task");
    expect(await runAgentRequest(data)).toBe(`/agent?conversation=${record}`);
    expect(fixtures.generate.mock.calls[0]?.[2]).toContain("Unique focused source");
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.anything());
  });
  it("rejects an unavailable focus before generation", async () => {
    fixtures.contextRows.agent_conversations = {id:record,project_id:workspace,opportunity_id:record,scope_mode:"workspace",context_page:"agent"};
    const data = new FormData(); data.set("connectionId",record); data.set("conversationId",record); data.set("message","Prepare");
    expect(await runAgentRequest(data)).toContain("error=");
    expect(fixtures.generate).not.toHaveBeenCalled();
  });
  it.each(["rejected", "applied", "superseded"])("rejects a correction of a %s proposal", async status => {
    fixtures.contextRows.agent_proposals = [{id:record,tool_name:"create_workspace",status}];
    fixtures.generate.mockResolvedValueOnce({output:{message:"Review",proposals:[{tool:"create_workspace",summary:"Revised",supersedesProposalId:record,targetId:null,title:null,body:null,dueAt:null,name:"New",objective:"Search"}]}});
    await expect(request()).rejects.toThrow("error=");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});


it.each([[429,"provider_rate_limited","reached%20its%20limit"],[503,"provider_unavailable","temporarily%20unavailable"]] as const)("explains provider %s failures without exposing response data", async (statusCode, code, message) => {
  fixtures.generate.mockRejectedValueOnce(Object.assign(new Error("private-provider-content"),{statusCode}));
  await expect(request()).rejects.toThrow(message);
  expect(fixtures.recordEvent).toHaveBeenCalledWith(expect.objectContaining({code}));
  expect(JSON.stringify(fixtures.recordEvent.mock.calls)).not.toContain("private-provider-content");
});

const interviewDetails = { interviewType: "Technical", startsAt: "2027-01-15T14:00:00+08:00", durationMinutes: 60, timezone: "Asia/Manila", meetingUrl: null, interviewers: null };
const contactDetails = { name: "Jane", relationship: "recruiter", role: null, company: null, email: "jane@example.com", phone: null, profileUrl: null, notes: null, followUpAt: null };
const baseCreation = { summary: "Review", title: null, body: null, dueAt: null, name: null, objective: null };
describe("Interview and contact creation boundaries", () => {
  it("persists an interview proposal without scheduling during generation", async () => {
    fixtures.opportunities = [{ id: record, next_action: null, next_action_due_at: null }];
    const proposal = { ...baseCreation, tool: "create_interview", targetId: record, interview: interviewDetails };
    fixtures.generate.mockResolvedValue({ output: { message: "Review", proposals: [proposal] } });
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.objectContaining({ input_output: { message: "Review", proposals: [{ ...proposal, expectedNextAction: null }] } }));
    expect(fixtures.rpc).not.toHaveBeenCalledWith("schedule_interview", expect.anything());
  });
  it("accepts a Workspace-only contact and rejects a foreign Workspace", async () => {
    const proposal = { ...baseCreation, tool: "create_contact", targetId: null, workspaceId: workspace, contact: contactDetails };
    fixtures.generate.mockResolvedValue({ output: { message: "Review", proposals: [proposal] } });
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.anything());
    fixtures.rpc.mockClear();
    fixtures.generate.mockResolvedValue({ output: { message: "Review", proposals: [{ ...proposal, workspaceId: owner }] } });
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.rpc).not.toHaveBeenCalledWith("complete_agent_run", expect.anything());
  });
  it("validates a linked contact against its already scoped Opportunity", async () => {
    fixtures.opportunities = [{ id: record, project_id: workspace, next_action: null, next_action_due_at: null }];
    const proposal = { ...baseCreation, tool: "create_contact", targetId: record, workspaceId: workspace, contact: contactDetails };
    fixtures.generate.mockResolvedValue({ output: { message: "Review", proposals: [proposal] } });
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run", expect.anything());
    fixtures.rpc.mockClear();
    fixtures.generate.mockResolvedValue({ output: { message: "Review", proposals: [{ ...proposal, workspaceId: "44444444-4444-4444-8444-444444444444" }] } });
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.rpc).not.toHaveBeenCalledWith("complete_agent_run", expect.anything());
  });
  it.each(["create_interview", "create_contact"])("opens only the owned applied %s record", async tool => {
    fixtures.contextRows.agent_proposals = { tool_name: tool, conversation_id: record, destination_project_id: workspace, applied_record_id: record, target_id: null };
    const table = tool === "create_interview" ? "interviews" : "contacts";
    fixtures.contextRows[table] = { id: record };
    const data = new FormData(); data.set("proposalId", record);
    await expect(openAgentResult(data)).rejects.toThrow(tool === "create_interview" ? `/interview/${record}` : `/contacts?edit=${record}`);
    expect(fixtures.filters).toContainEqual([table, "user_id", owner]);
    expect(fixtures.filters).toContainEqual([table, "project_id", workspace]);
    fixtures.contextRows[table] = null;
    fixtures.rpc.mockClear();
    await expect(openAgentResult(data)).rejects.toThrow("result%20is%20no%20longer%20available");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});
