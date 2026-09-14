import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  generate: vi.fn(), rpc: vi.fn(), updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  contextError: false,
}));
const owner = "11111111-1111-4111-8111-111111111111";
const workspace = "22222222-2222-4222-8222-222222222222";
const record = "33333333-3333-4333-8333-333333333333";

vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ generateAgentResponse: fixtures.generate }));
vi.mock("@/lib/ai/secrets", () => ({ decryptSecret: () => "fixture-key" }));
vi.mock("@/lib/observability", () => ({ recordSystemEvent: vi.fn() }));
vi.mock("@/features/projects/context", () => ({ requireSearchContext: async () => ({ user: { id: owner }, project: { id: workspace }, projects: [{ id: workspace,name: "Search" }],supabase: client }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => client }));

const client = {
  rpc: fixtures.rpc,
  from(table: string) {
    let operation = "read";
    const result = () => {
      if (table === "ai_connections") return { data: {id: record,provider:"openai",model:"fixture",status:"connected"},error:null };
      if (operation === "insert") return {data:{id:record},error:null};
      if (table === "profiles" && fixtures.contextError) return {data:null,error:{message:"database unavailable"}};
      if (["agent_messages","opportunities","tasks","jobs","interviews","contacts","documents"].includes(table)) return {data:[],error:null};
      return {data:null,error:null,count:0};
    };
    const query = {
      select: () => query, eq: () => query, neq: () => query, gte: () => query, order: () => query, limit: () => query,
      insert: () => { operation="insert"; return query; },
      update: (values: Record<string, unknown>) => { fixtures.updates.push({table,values}); return query; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  },
};

import { sendAgentMessage } from "./actions";
function request() {
  const data = new FormData();
  data.set("connectionId",record);data.set("message","What happens next?");
  return sendAgentMessage(data);
}
beforeEach(() => {
  fixtures.contextError=false;fixtures.updates.length=0;
  fixtures.generate.mockReset().mockResolvedValue({output:{message:"A grounded answer",proposals:[]},inputTokens:10,outputTokens:20});
  fixtures.rpc.mockReset().mockResolvedValue({error:null});
});
describe("Agent result persistence", () => {
  it("commits the validated answer through the atomic persistence seam", async () => {
    await expect(request()).rejects.toThrow(`redirect:/agent?conversation=${record}`);
    expect(fixtures.rpc).toHaveBeenCalledWith("complete_agent_run",expect.objectContaining({input_run_id:record,input_output:{message:"A grounded answer",proposals:[]}}));
    expect(fixtures.updates.some(({values})=>values.status==="failed")).toBe(false);
  });
  it("does not call a provider when context cannot be read", async () => {
    fixtures.contextError=true;
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.generate).not.toHaveBeenCalled();
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
  it("reports persistence failures instead of claiming success", async () => {
    fixtures.rpc.mockResolvedValue({error:{message:"insert rejected"}});
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.updates).toContainEqual(expect.objectContaining({table:"ai_runs",values:expect.objectContaining({status:"failed"})}));
    expect(fixtures.updates).toContainEqual({table:"agent_messages",values:{run_id:record}});
  });
  it("rejects unknown target proposals rather than silently dropping them", async () => {
    fixtures.generate.mockResolvedValue({output:{message:"Review this task",proposals:[{tool:"create_task",targetId:record,summary:"Add task",title:"Prepare",body:null,dueAt:null,name:null,objective:null}]}});
    await expect(request()).rejects.toThrow("error=Agent");
    expect(fixtures.rpc).not.toHaveBeenCalled();
  });
});
