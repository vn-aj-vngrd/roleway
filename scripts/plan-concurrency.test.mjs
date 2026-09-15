// Run only against the disposable database used by migration CI.
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
if (!process.env.PGDATABASE?.includes('test') && !process.env.PGDATABASE?.startsWith('roleway_plans')) throw new Error('Use a disposable test database.');
const id=randomUUID();
function sql(text) { const r=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-At'],{input:text,encoding:'utf8'});if(r.status)throw new Error(r.stderr);return r.stdout.trim(); }
function concurrent(name) {return new Promise(resolve=>{const p=spawn('psql',['-X','-v','ON_ERROR_STOP=1','-At']);let error='';p.stderr.on('data',v=>error+=v);p.stdout.resume();p.on('close',code=>resolve({code,error}));p.stdin.end(`begin; insert into public.search_projects(user_id,name) values('${id}','${name}'); select pg_sleep(0.5); commit;`);});}
try {
 sql(`insert into auth.users(id,email,email_confirmed_at) values('${id}','e2e-concurrency-${id}@roleway.test',now()); insert into public.account_plans(user_id,plan_slug,expires_at) values('${id}','plus',now()+interval '1 hour') on conflict(user_id) do update set plan_slug=excluded.plan_slug,expires_at=excluded.expires_at; insert into public.search_projects(user_id,name) select '${id}','Existing '||n from generate_series(2,(select workspace_limit-1 from public.plan_catalog where slug='plus')) n;`);
 const outcomes=await Promise.all([concurrent('Concurrent A'),concurrent('Concurrent B')]);
 assert.equal(outcomes.filter(r=>r.code===0).length,1,'Exactly one concurrent creation must succeed');
 assert.ok(outcomes.some(r=>r.error.includes('PLAN_WORKSPACE_LIMIT')),'The second creation must fail at the quota');
 assert.equal(sql(`select count(*)=(select workspace_limit from public.plan_catalog where slug='plus') from public.search_projects where user_id='${id}';`),'t');
 console.log('Concurrent Workspace limit passed.');
} finally { sql(`delete from auth.users where id='${id}';`); }
