import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const releaseRequire = createRequire(require.resolve('semantic-release'));
const { analyzeCommits } = await import(releaseRequire.resolve('@semantic-release/commit-analyzer'));
const { generateNotes } = await import(releaseRequire.resolve('@semantic-release/release-notes-generator'));
const config = JSON.parse(readFileSync(new URL('../.releaserc.json', import.meta.url)));
const logger = { log() {}, error() {} };
for (const [message, expected] of [['feat: Add Agent history','minor'],['fix: Save approval','patch'],['docs: Explain setup','patch'],['feat!: Change workflow\n\nBREAKING CHANGE: Migrate records','major']]) {
  test(`release: ${message.split('\n')[0]}`, async () => {
    assert.equal(await analyzeCommits(config.plugins[0][1], { commits: [{ message, hash: '1234567890' }], logger, cwd: process.cwd() }), expected);
  });
}
test('release notes render with the installed preset', async () => {
  const notes = await generateNotes(config.plugins[1][1], { commits: [{ message:'fix: Preserve approval cards',hash:'1234567890abcdef' }],logger,cwd:process.cwd(),options:{repositoryUrl:'https://github.com/vn-aj-vngrd/roleway'},lastRelease:{version:'1.0.0',gitTag:'v1.0.0'},nextRelease:{version:'1.0.1',gitTag:'v1.0.1'} });
  assert.match(notes,/Preserve approval cards/);
});
test('PR title validator rejects invalid and multiline subjects', () => {
  const dir = mkdtempSync(join(tmpdir(),'roleway-workflow-'));
  try {
    for (const [title,status] of [['fix(agent): Save proposals',0],['Update code',1],['Merge branch main',1],['feat: Title\nsecond line',1]]) {
      const file=join(dir,'event.json');writeFileSync(file,JSON.stringify({pull_request:{title}}));
      const result=spawnSync(process.execPath,['scripts/validate-commit-message.mjs','--pr-title'],{env:{...process.env,GITHUB_EVENT_PATH:file}});
      assert.equal(result.status,status,title);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
