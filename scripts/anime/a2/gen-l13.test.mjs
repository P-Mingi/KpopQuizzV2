// node --test scripts/anime/a2/gen-l13.test.mjs : the rules of gen-l13.mjs on the real data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build, storedValues, top200Rows } from './gen-l13.mjs';
import { l04Characters } from './gen-sql.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const all = JSON.parse(readFileSync(path.join(HERE, 'data', 'all-series.json'), 'utf8'));
const top = top200Rows(readFileSync(path.join(HERE, 'data', 'TOP200.md'), 'utf8'));
const l04 = l04Characters(readFileSync(path.join(ROOT, 'docs/pending-migrations/multisite/launch/L04-K1-series.sql'), 'utf8'));
const a1 = JSON.parse(readFileSync(path.join(ROOT, 'scripts/anime/a1/data/a1-facts.json'), 'utf8'));
const demographics = a1.series.filter((s) => all.series.some((x) => x.slug === s.slug)).sort((x, y) => (x.slug < y.slug ? -1 : 1));
const run = (opts = {}) => build({ all, top, l04, demographics, ...opts });

test('the TOP200 table has 200 rows and each is one character of the pool', () => {
  assert.equal(top.length, 200);
  assert.equal(run().counts.featured, 200);
});

test('750 characters, 50 series, none waiting: every character of the pool is in L04', () => {
  const r = run();
  assert.equal(r.counts.characters, 750);
  assert.equal(r.counts.series, 50);
  assert.deepEqual(r.counts.waiting, []);
  assert.match(r.sql, /expect 750/);
});

test('a character L04 does not have is skipped and listed', () => {
  const r = run({ l04: new Set([...l04].filter((k) => k !== 'one-piece/monkey-d-luffy')) });
  assert.equal(r.counts.characters, 749);
  assert.deepEqual(r.counts.waiting, ['one-piece/monkey-d-luffy']);
});

test('featured is true for exactly the 200 rows of the TOP200', () => {
  const r = run();
  const rows = r.sql.split('\n').filter((l) => l.startsWith('insert into public.character_facts'));
  assert.equal(rows.length, 750);
  assert.equal(rows.filter((l) => /, true\) on conflict/.test(l)).length, 200);
});

test('stored values: unknown is null, a species outside the pattern is null, gender and role are the table words', () => {
  const v = storedValues({ gender: { value: 'Male' }, species: { value: 'Not A Species' }, role_at_debut: { value: 'villain' }, first_appearance: { value: 'Chapter 1' }, voice_actor_ja: { value: 'Unknown' } });
  assert.deepEqual(v, { gender: 'male', species: null, role_at_debut: null, first_appearance: 'Chapter 1', voice_actor_ja: null });
});

test('same input, same output; a slug two series share gets the series in front in entity_sources', () => {
  assert.equal(run().sql, run().sql);
  assert.ok(run().sql.includes("'gintama/kagura'") && run().sql.includes("'inuyasha/kagura'"));
});

test('every stored value has a source or is the role of the site data; fandom, wikidata and wikipedia only; no banned dash', () => {
  const r = run();
  assert.ok(r.counts.sources > 4000);
  assert.ok(!/[–—]/.test(r.sql + r.rollback));
  const hosts = new Set([...r.sql.matchAll(/'(fandom|wikidata|wikipedia)', (?:'[^']*'|null), '(https:\/\/[^']+)'/g)].map((m) => `${m[1]} ${new URL(m[2]).hostname.replace(/^[a-z0-9-]+\.(fandom\.com)$/, '$1').replace(/^(www|en)\./, '')}`));
  assert.deepEqual([...hosts].sort(), ['fandom fandom.com', 'wikidata wikidata.org', 'wikipedia wikipedia.org']);
});
