// node --test scripts/anime/sql/single-do-block.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSingleDoBlock, toSingleDoBlock } from './single-do-block.mjs';

const SAMPLE = `-- L99-x.sql (header)
--
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;
do $op$ begin
  if to_regclass('public.t') is null then
    raise exception 'L99: t is missing';
  end if;
end $op$;

update public.t set v = 'it''s; fine' where id = 1;

update public.t
set v = 'two lines'
where id = 2;

do $op$ declare n int; begin
  select count(*) into n from public.t;
  if n <> 1 then raise exception 'L99: % rows', n; end if;
end $op$;
`;

test('converts statements into one DO block, header kept, literals untouched', () => {
  const out = toSingleDoBlock(SAMPLE, 'o1l99');
  assert.ok(isSingleDoBlock(out, 'o1l99'));
  assert.match(out, /^-- L99-x\.sql \(header\)\n--\n-- o1-transaction: single, ONE DO block \(atomic on its own, in psql and in the Supabase SQL Editor\)\. Idempotent/);
  assert.match(out, /do \$o1l99\$\nbegin\nperform set_config\('lock_timeout', '5s', true\);\nperform set_config\('client_min_messages', 'warning', true\);\n/);
  assert.ok(out.includes("update public.t set v = 'it''s; fine' where id = 1;"));
  assert.ok(out.includes("update public.t\nset v = 'two lines'\nwhere id = 2;"));
  assert.ok(out.includes('\nbegin\n  if to_regclass'));
  assert.ok(out.includes('\ndeclare n int; begin\n'));
  assert.equal((out.match(/\$op\$/g) ?? []).length, 0);
  assert.ok(out.endsWith('\nend $o1l99$;\n'));
});

test('refuses what it cannot convert safely', () => {
  assert.throws(() => toSingleDoBlock('create temp table x (a int) on commit drop;\n', 'o1x'), /temp table/);
  assert.throws(() => toSingleDoBlock('create index concurrently i on t (a);\n', 'o1x'), /CONCURRENTLY/);
  assert.throws(() => toSingleDoBlock('begin;\nupdate t set a = 1;\ncommit;\n', 'o1x'), /transaction command/);
  assert.throws(() => toSingleDoBlock("set search_path = public;\n", 'o1x'), /top-level set/);
  assert.throws(() => toSingleDoBlock('select $o1x$ a $o1x$;\n', 'o1x'), /already used/);
  assert.throws(() => toSingleDoBlock('do $a$ begin\n  perform 1;\n', 'o1x'), /without an end/);
  assert.throws(() => toSingleDoBlock('do $a$ begin\nend $b$;\n', 'o1x'), /closes no open DO block/);
});

test('isSingleDoBlock rejects a file with a second top-level statement', () => {
  const one = toSingleDoBlock(SAMPLE, 'o1l99');
  assert.ok(!isSingleDoBlock(`${one}update public.t set v = 1;\n`, 'o1l99'));
  assert.ok(!isSingleDoBlock(SAMPLE, 'o1l99'));
});
