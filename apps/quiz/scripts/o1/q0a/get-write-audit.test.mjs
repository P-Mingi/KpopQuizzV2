// Run O1, lane Q0a: unit tests of the GET write audit (node --test apps/quiz/scripts/o1/q0a/*.test.mjs).
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { resolveRoute, rpcWrites, writeSites } from './get-write-audit.mjs';

test('writeSites finds table writes, storage uploads, RPCs and non-GET fetches', () => {
  const src = [
    "const { error } = await svc.from('quiz_time_stats').update({ a: 1 }).eq('id', x);",
    "await db.from(table).delete().eq('user_id', id);",
    "await supabase.storage.from('avatars').upload(p, file);",
    "const NAME = 'ensure_daily_debate'; await db.rpc(NAME);",
    "await db.rpc('get_today_stats');",
    "await fetch(url, { method: 'POST', body });",
    "createHash('sha256').update(s).digest('hex');",
    "await fetch(url);",
  ].join('\n');
  const got = writeSites(src).map((s) => `${s.op}:${s.target}`);
  assert.deepEqual(got.sort(), ['delete:<table>', 'fetch:POST', 'rpc:ensure_daily_debate', 'rpc:get_today_stats', 'update:quiz_time_stats', 'upload:storage'].sort());
});

test('rpcWrites reads the SQL definition', () => {
  assert.equal(rpcWrites('ensure_daily_debate').verdict, 'writes');
  assert.equal(rpcWrites('get_today_stats').verdict, 'reads');
  assert.equal(rpcWrites('no_such_function_o1').verdict, 'unknown');
});

test('resolveRoute: static, dynamic, pretty URLs, special files, unknown paths', () => {
  const r = (p) => { const x = resolveRoute(p); return x ? path.basename(path.dirname(x.file)) + '/' + path.basename(x.file) : null; };
  assert.equal(r('/q/some-quiz'), '[slug]/page.tsx');
  assert.equal(r('/bts-quiz'), '[slug]/page.tsx');
  assert.equal(r('/which-bts-member-are-you'), '[group]/page.tsx');
  assert.equal(r('/llms.txt'), 'llms.txt/route.ts');
  assert.equal(r('/daily'), 'daily/route.ts');
  assert.match(resolveRoute('/sitemap.xml').file, /app\/sitemap\.ts$/);
  assert.equal(resolveRoute('/an-unknown-path'), null);
});
