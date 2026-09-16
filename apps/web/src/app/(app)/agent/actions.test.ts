import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  generate: vi.fn(), rpc: vi.fn(), updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  opportunities: [] as Array<{ id: string; next_action: string | null; next_action_due_at: string | null }>,
  contextError: false, recordEvent: vi.fn(),
}));
const owner = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";
const record = "33333333-3333-4333-8333-333333333333";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ generateAgentResponse: fixtures.generate }));
vi.mock("@/lib/ai/secrets", () => ({ decryptSecret: () => "fixture-key" }));
vi.mock("@/lib/observability", () => ({ recordSystemEvent: fixtures.recordEvent }));
vi.mock("@/features/projects/context", () => ({ requireSearchContext: async () => ({ user: { id: owner }, project: { id: workspace }, projects: [{ id: workspace,name: "Search" }],supabase: client }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }));

const client = {
  rpc: fixtures.rpc,
  from(table: string) {
    let operation = "read";
    const result = () => {
      if (table === "ai_connections") return { data: {id: record,provider:"openai",model:"fixture",status:"connected"},error:null };
      if (table === "opportunities") return {data:fixtures.opportunities,error:null};
      if (operation === "insert") return {data:{id:record},error:null};
      if (table === "profiles" && fixtures.contextError) return {data:null,error:{message:"database unavailable"}};
      if (["agent_messages","opportunities","tasks","jobs","interviews","contacts","documents"].includes(table)) return {data:[],error:null};
      return {data:null,error:null,count:0};
    };
    const query = {
      select: () => query, in: () => query, eq: () => query, neq: () => query, gte: () => query, order: () => query, limit: () => query,
      insert: () => { operation="insert"; return query; },
      update: (values: Record<string, unknown>) => { fixtures.updates.push({table,values}); return query; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  },
};

import { sendAgentMessage } from "./actions";
function request(timeZone = "Asia/Manila") {
  const data = new FormData();
  data.set("timeZone",timeZone);data.set("connectionId",record);data.set("message","What happens next?");
  return sendAgentMessage(data);
}
beforeEach(() => {
  fixtures.recordEvent.mockClear();
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
