// Run O1, lane Q0a: unit tests of the parity write guard and frozen data source (node --test scripts/o1/parity/).
// A local HTTP server stands in for Supabase: it counts requests and answers a new number each time, so a frozen
// read is visible (the second answer equals the first).
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { classify, keyOf, maskVolatile } from './freeze-hook.mjs';
import { rpcVerdict } from './rpc-verdict.mjs';

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'freeze-hook.mjs');

test('classify: reads frozen, writes refused, other Supabase GETs allowed', () => {
  assert.equal(classify('GET', '/rest/v1/quizzes'), 'freeze');
  assert.equal(classify('HEAD', '/rest/v1/quizzes'), 'freeze');
  assert.match(classify('POST', '/rest/v1/quizzes'), /POST on a table/);
  assert.match(classify('PATCH', '/rest/v1/profiles'), /PATCH on a table/);
  assert.match(classify('DELETE', '/rest/v1/plays'), /DELETE on a table/);
  assert.equal(classify('POST', '/rest/v1/rpc/get_today_stats'), 'freeze');
  assert.match(classify('POST', '/rest/v1/rpc/ensure_daily_debate'), /^rpc ensure_daily_debate \(writes/);
  assert.match(classify('POST', '/rest/v1/rpc/no_such_fn_o1'), /unknown/);
  assert.equal(classify('GET', '/auth/v1/user'), 'allow');
  assert.match(classify('POST', '/auth/v1/token'), /POST on auth/);
  assert.match(classify('POST', '/realtime/v1/api/broadcast'), /POST on realtime/);
  assert.match(classify('POST', '/functions/v1/x'), /POST on functions/);
});

test('rpcVerdict: STABLE functions read, a call of a writer writes', () => {
  assert.equal(rpcVerdict('get_rising_creators').verdict, 'reads');
  assert.equal(rpcVerdict('ensure_daily_debate').verdict, 'writes');
});

test('keyOf masks timestamps and separates auth classes without storing them', () => {
  const u1 = 'https://x.supabase.co/rest/v1/plays?select=id&created_at=gte.2026-10-16T12%3A34%3A56.789Z';
  const u2 = 'https://x.supabase.co/rest/v1/plays?select=id&created_at=gte.2026-10-16T12%3A38%3A01.002Z';
  const anon = { headers: { apikey: 'anon', Authorization: 'Bearer anon' } };
  const svc = { headers: { apikey: 'svc', Authorization: 'Bearer svc' } };
  assert.equal(keyOf('GET', u1, undefined, u1, anon), keyOf('GET', u2, undefined, u2, anon));
  assert.notEqual(keyOf('GET', u1, undefined, u1, anon), keyOf('GET', u1, undefined, u1, svc));
  assert.equal(maskVolatile('a 2026-10-16T12:34:56Z b 2026-10-16'), 'a <ts> b 2026-10-16');
});

function serve() {
  let n = 0; const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => { body += c; });
    req.on('end', () => { n++; seen.push(`${req.method} ${req.url}`); res.setHeader('content-type', 'application/json'); res.setHeader('content-range', `0-0/${n}`); res.end(JSON.stringify({ n, body })); });
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, port: srv.address().port, seen, count: () => n })));
}

// Each scenario runs in a child process with the hook preloaded, as parity.sh loads it (asynchronously: the stand-in
// server lives in this process and must keep answering).
function child(code, env) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--import', HOOK, '--input-type=module', '-e', code], { env: { ...process.env, ...env }, timeout: 30_000 },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(JSON.parse(stdout.trim().split('\n').pop()))));
  });
}

test('freeze: the first answer is stored, later identical reads replay it, across processes', async () => {
  const s = await serve();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-freeze-'));
  const env = { O1_FREEZE_DIR: dir, O1_FREEZE_TARGET: `http://127.0.0.1:${s.port}` };
  const read = `const u='http://127.0.0.1:${s.port}/rest/v1/quizzes?select=id';
    const a = await (await fetch(u, { headers: { apikey: 'k' } })).json();
    const b = await (await fetch(u, { headers: { apikey: 'k' } })).json();
    const c = await (await fetch(u + '&x=1', { headers: { apikey: 'k' } })).json();
    const r = await fetch('http://127.0.0.1:${s.port}/rest/v1/rpc/get_today_stats', { method: 'POST', body: '{}', headers: { apikey: 'k' } });
    console.log(JSON.stringify({ a: a.n, b: b.n, c: c.n, range: r.headers.get('content-range') }));`;
  try {
    const first = await child(read, env);
    assert.equal(first.a, first.b); // replayed in the same process
    assert.notEqual(first.a, first.c); // another query is another key
    const second = await child(read, env); // a second process (the head build, a server) replays the store
    assert.deepEqual(second, first);
    assert.equal(s.count(), 3); // two GETs and one RPC reached the server, once each
  } finally { s.srv.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('guard: a write never reaches the server and is logged', async () => {
  const s = await serve();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'o1-freeze-'));
  const env = { O1_FREEZE_DIR: dir, O1_FREEZE_TARGET: `http://127.0.0.1:${s.port}` };
  const write = `const base='http://127.0.0.1:${s.port}';
    const a = await fetch(base + '/rest/v1/plays', { method: 'POST', body: '{"x":1}' });
    const b = await fetch(base + '/rest/v1/rpc/ensure_daily_debate', { method: 'POST', body: '{}' });
    const c = await fetch(base + '/rest/v1/profiles?id=eq.1', { method: 'PATCH', body: '{}' });
    const d = await fetch('http://127.0.0.1:9/elsewhere').then(() => 'ok', () => 'not touched');
    console.log(JSON.stringify({ a: a.status, b: b.status, c: c.status, d, code: (await a.json()).code }));`;
  try {
    const r = await child(write, env);
    assert.deepEqual(r, { a: 403, b: 403, c: 403, d: 'not touched', code: 'O1RO' });
    assert.equal(s.count(), 0);
    const logged = fs.readFileSync(path.join(dir, 'refused.log'), 'utf8').trim().split('\n');
    assert.equal(logged.length, 3);
    assert.match(logged[1], /^run POST \/rest\/v1\/rpc\/ensure_daily_debate rpc ensure_daily_debate \(writes/);
    assert.doesNotMatch(logged.join('\n'), /"x":1/); // bodies are never logged
  } finally { s.srv.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the hook stays out of the way without its two variables', () => {
  const r = spawnSync(process.execPath, ['--import', HOOK, '--input-type=module', '-e', 'console.log(JSON.stringify({ on: !!globalThis.__o1FreezeInstalled }))'],
    { env: { ...process.env, O1_FREEZE_DIR: '', O1_FREEZE_TARGET: '' }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(r.stdout), { on: false });
});
