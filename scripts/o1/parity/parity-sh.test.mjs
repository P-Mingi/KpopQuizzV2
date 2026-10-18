// Run O1, lane Q0a: tests of parity.sh's kept-build entries (--check-kept, --serve-kept) without any build or
// database: a temporary KPQ folder holds a stand-in env file (its Supabase is a local test server), a stand-in
// kept.json and a stand-in kept worktree. --offline everywhere, so the cron window never applies.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const PARITY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../parity.sh');
const HEAD = 'a'.repeat(40);

function setup(port) {
  const kpq = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-parity-sh-'));
  fs.mkdirSync(path.join(kpq, 'secrets'));
  fs.writeFileSync(path.join(kpq, 'secrets/kpop-parity.env'), `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${port}\nNEXT_PUBLIC_SITE_ID=anime\n`);
  const wt = path.join(kpq, 'head');
  fs.mkdirSync(path.join(wt, 'apps/quiz/.next'), { recursive: true });
  fs.writeFileSync(path.join(wt, 'apps/quiz/.next/BUILD_ID'), 'x');
  const freeze = path.join(kpq, 'cache/parity/k/freeze');
  fs.mkdirSync(freeze, { recursive: true });
  fs.writeFileSync(path.join(kpq, 'cache/parity/kept.json'), JSON.stringify({ base: 'b'.repeat(40), head: HEAD, worktree: wt, freeze }));
  return { kpq, freeze };
}

function run(kpq, args) {
  return spawnSync('bash', [PARITY, ...args], { env: { ...process.env, O1_KPQ: kpq }, encoding: 'utf8', timeout: 60_000 });
}

test('--check-kept runs one command in the parity environment: production flags, frozen state, strict, offline', async () => {
  let hits = 0;
  const srv = http.createServer((req, res) => { hits++; res.end('{}'); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { kpq, freeze } = setup(srv.address().port);
  try {
    const code = `const e = process.env; const r = await fetch(e.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/quizzes?select=id');
      console.log(JSON.stringify({ ux: e.NEXT_PUBLIC_UX_V1 + e.NEXT_PUBLIC_UX_V12 + e.NEXT_PUBLIC_BT_TRACKING, site: e.NEXT_PUBLIC_SITE_ID ?? null,
        strict: e.O1_FREEZE_STRICT, offline: e.O1_FREEZE_OFFLINE, phase: e.O1_FREEZE_PHASE, dir: e.O1_FREEZE_DIR, status: r.status }));`;
    const r = run(kpq, ['--check-kept', HEAD, '--offline', '--', process.execPath, '--input-type=module', '-e', code]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.deepEqual(out, { ux: '111', site: null, strict: '1', offline: '1', phase: 'gate-check', dir: freeze, status: 503 });
    assert.equal(hits, 0, 'offline: nothing reached the stand-in Supabase');
  } finally { srv.close(); fs.rmSync(kpq, { recursive: true, force: true }); }
});

test('--check-kept and --serve-kept refuse a head that is not the kept one, or a kept build that is gone', () => {
  const { kpq, freeze } = setup(9);
  try {
    let r = run(kpq, ['--check-kept', 'c'.repeat(40), '--offline', '--', 'true']);
    assert.equal(r.status, 4);
    assert.match(r.stderr, /kept parity build is of aaaaaaaaaaaa, not of cccccccccccc/);
    r = run(kpq, ['--serve-kept', 'c'.repeat(40), '4999', '--offline']);
    assert.equal(r.status, 4);
    fs.rmSync(freeze, { recursive: true });
    r = run(kpq, ['--check-kept', HEAD, '--offline', '--', 'true']);
    assert.equal(r.status, 4);
    assert.match(r.stderr, /kept frozen state is gone/);
    fs.rmSync(path.join(kpq, 'cache/parity/kept.json'));
    r = run(kpq, ['--serve-kept', HEAD, '4999', '--offline']);
    assert.equal(r.status, 4);
    assert.match(r.stderr, /no kept parity build/);
    r = run(kpq, ['--check-kept', HEAD, '--offline']);
    assert.equal(r.status, 4);
  } finally { fs.rmSync(kpq, { recursive: true, force: true }); }
});
