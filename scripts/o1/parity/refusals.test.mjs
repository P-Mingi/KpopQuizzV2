// Run O1, lane Q0a: tests of refusals.mjs, the verdict on the writes the freeze hook refused in a parity run.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { judge, render } from './refusals.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'refusals.mjs');
// The two lines of Q0a's offline rehearsal (2026-10-17), as freeze-hook.mjs wrote them.
const DEBATE = 'POST /rest/v1/rpc/ensure_daily_debate rpc ensure_daily_debate (writes: update public.debate_questions set in supabase/migrations/108_daily_debate_cheers.sql)';
const REHEARSAL = `build-base ${DEBATE}\nbuild-head ${DEBATE}\n`;

test('a build write the base build makes too is listed, not failing (the rehearsal)', () => {
  const v = judge(REHEARSAL);
  assert.equal(v.failing, 0);
  assert.equal(v.rows.length, 2);
  assert.match(render(v), /refused writes: none failing\n$/);
});

test('a write the head build adds fails', () => {
  const v = judge(`${REHEARSAL}build-head POST /rest/v1/rpc/award_xp rpc award_xp (writes: insert)\n`);
  assert.equal(v.failing, 1);
  assert.equal(v.rows.find((r) => r.request.includes('award_xp')).verdict, 'FAILS: a write the head build adds');
});

test('the same path with another reason in the head build is a new write', () => {
  const v = judge(`build-base POST /rest/v1/votes insert\nbuild-head POST /rest/v1/votes upsert\n`);
  assert.equal(v.failing, 1);
});

test('a write the base build makes and the head build drops is listed only', () => {
  assert.equal(judge(`build-base ${DEBATE}\n`).failing, 0);
});

test('a refusal outside the builds fails, whatever the base build did', () => {
  for (const phase of ['serve-base', 'serve-head', 'run', 'gate-serve', 'gate-check']) {
    const v = judge(`${REHEARSAL}${phase} ${DEBATE}\n`);
    assert.equal(v.failing, 1, phase);
  }
  const strict = judge('gate-check POST https://example.org/collect strict: not a read\n');
  assert.equal(strict.failing, 1);
  assert.equal(strict.rows[0].request, 'POST https://example.org/collect strict: not a read');
});

test('counts per phase and request; the output does not depend on the log order', () => {
  const lines = [`build-base ${DEBATE}`, `build-head ${DEBATE}`, `build-head ${DEBATE}`, 'serve-head POST /rest/v1/x insert'];
  const a = render(judge(`${lines.join('\n')}\n`));
  const b = render(judge(`${[...lines].reverse().join('\n')}\n\n`));
  assert.equal(a, b);
  assert.match(a, /^ {3}2 build-head /m);
  assert.match(a, /refused writes: 1 failing\n$/);
});

test('the command writes refused.txt and exits 0, 1 or 2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-refusals-'));
  try {
    const log = path.join(dir, 'refused.log');
    const out = path.join(dir, 'refused.txt');
    fs.writeFileSync(log, REHEARSAL);
    let r = spawnSync(process.execPath, [CLI, log, out], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(out, 'utf8'), /none failing/);
    fs.appendFileSync(log, `serve-head ${DEBATE}\n`);
    r = spawnSync(process.execPath, [CLI, log, out], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(fs.readFileSync(out, 'utf8'), /FAILS: refused outside the builds/);
    r = spawnSync(process.execPath, [CLI, log], { encoding: 'utf8' });
    assert.equal(r.status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
