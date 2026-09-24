// Run only against migrated disposable PostgreSQL. No provider calls or private data.
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
if (!process.env.PGDATABASE?.includes("test"))
  throw new Error("Use a disposable test database.");
function sql(query) {
  const result = spawnSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], {
    input: query,
    encoding: "utf8",
  });
  if (result.status) throw new Error(result.stderr);
  return result.stdout.trim();
}
function concurrent(query) {
  return new Promise((resolve) => {
    const child = spawn("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"]);
    let error = "";
    child.stderr.on("data", (data) => (error += data));
    child.stdout.resume();
    child.on("close", (code) => resolve({ code, error }));
    child.stdin.end(query);
  });
}
for (const winner of ["revision", "approval"]) {
  const owner = randomUUID(),
    job = randomUUID(),
    opportunity = randomUUID(),
    conversation = randomUUID(),
    originalRun = randomUUID(),
    revisedRun = randomUUID();
  try {
    sql(`insert into auth.users(id,email,email_confirmed_at) values('${owner}','e2e-revision-${owner}@roleway.test',now());
      insert into public.jobs(id,user_id,project_id,company,title) select '${job}','${owner}',active_project_id,'Fixture','Engineer' from public.profiles where user_id='${owner}';
      insert into public.opportunities(id,user_id,project_id,job_id) select '${opportunity}','${owner}',active_project_id,'${job}' from public.profiles where user_id='${owner}';
      insert into public.agent_conversations(id,user_id,project_id,title) select '${conversation}','${owner}',active_project_id,'Race' from public.profiles where user_id='${owner}';
      insert into public.ai_runs(id,user_id,project_id,conversation_id,task_type,provider,model,status) select n,'${owner}',active_project_id,'${conversation}','conversation','openai','fixture','generating' from public.profiles cross join unnest(array['${originalRun}'::uuid,'${revisedRun}'::uuid]) n where user_id='${owner}';`);
    const original = {
      tool: "create_task",
      targetId: opportunity,
      summary: "Original",
      title: "Original",
      dueAt: null,
    };
    const originalOutput = JSON.stringify({
      message: "Review",
      proposals: [original],
    });
    sql(
      `select public.complete_agent_run('${originalRun}','${originalOutput}'::jsonb,null,null);`,
    );
    const proposal = sql(
      `select id from public.agent_proposals where run_id='${originalRun}';`,
    );
    const revised = JSON.stringify({
      message: "Review revision",
      proposals: [
        { ...original, title: "Revised", supersedesProposalId: proposal },
      ],
    });
    const revision = `select public.complete_agent_run('${revisedRun}','${revised}'::jsonb,null,null);`;
    const approval = `set request.jwt.claim.sub='${owner}'; select public.decide_agent_proposal('${proposal}','approve');`;
    // Hold the exact production conversation lock so each ordering is deterministic.
    const first = winner === "revision" ? revision : approval;
    const second = winner === "revision" ? approval : revision;
    let locked;
    const ready = new Promise((resolve) => {
      locked = resolve;
    });
    const leading = new Promise((resolve) => {
      const child = spawn("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"]);
      let error = "";
      child.stdout.on("data", (data) => {
        if (String(data).includes("LOCKED")) locked();
      });
      child.stderr.on("data", (data) => (error += data));
      child.on("close", (code) => {
        locked();
        resolve({ code, error });
      });
      child.stdin.end(
        `begin; select 1 from public.agent_conversations where id='${conversation}' for update; select 'LOCKED'; select pg_sleep(0.3); ${first} commit;`,
      );
    });
    await ready;
    const results = await Promise.all([leading, concurrent(second)]);
    assert.equal(results[0].code, 0);
    assert.ok(!results.some((result) => result.error.includes("deadlock")));
    if (winner === "revision") {
      assert.equal(results[1].code, 0);
      assert.equal(
        sql(`select count(*) from public.tasks where user_id='${owner}';`),
        "0",
      );
      assert.equal(
        sql(
          `select status from public.agent_proposals where id='${proposal}';`,
        ),
        "superseded",
      );
    } else {
      assert.notEqual(results[1].code, 0);
      assert.match(results[1].error, /revision is no longer available/);
      assert.equal(
        sql(`select count(*) from public.tasks where user_id='${owner}';`),
        "1",
      );
      assert.equal(
        sql(
          `select count(*) from public.agent_proposals where run_id='${revisedRun}';`,
        ),
        "0",
      );
    }
  } finally {
    sql(`delete from auth.users where id='${owner}';`);
  }
}
console.log("Concurrent revision/approval orderings passed.");
