// node --test scripts/anime/a2/gen-sql.test.mjs : the rules of gen-sql.mjs on the real data and the real 024.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { GAMES, build, columnsOf, l04Characters, loadVoices } from './gen-sql.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const migration = read('docs/pending-migrations/multisite/024-dle-series-games.sql');
const l04 = l04Characters(read('docs/pending-migrations/multisite/launch/L04-K1-series.sql'));
const data = Object.fromEntries(GAMES.map((g) => [g.id, JSON.parse(readFileSync(path.join(HERE, 'data', g.file), 'utf8'))]));
const run = (opts = {}) => build({ data, l04, columns: columnsOf(migration), ...opts });

test('the columns come from 024: 8 and 8, no Dragon Ball height, One Piece height kept', () => {
  const c = columnsOf(migration);
  assert.equal(c['otakudle-one-piece'].length, 8);
  assert.equal(c['otakudle-dragon-ball'].length, 8);
  assert.ok(c['otakudle-one-piece'].some((x) => x.key === 'height_cm'));
  assert.ok(!c['otakudle-dragon-ball'].some((x) => x.key === 'height_cm'));
});

test('dropping or adding a column of 024 is all it takes: the data follows', () => {
  const without = run({ columns: columnsOf(migration.replace(/^\s*\('otakudle-one-piece', 'height_cm'.*$/m, '')) });
  assert.ok(!without.sql.includes('"height_cm"'));
  assert.ok(run().sql.includes('"height_cm"'));
});

test('only the characters L04 has are loaded (all but 4 GT characters), the others are listed as waiting', () => {
  const r = run();
  assert.deepEqual(r.games.map((g) => [g.id, g.loaded, g.waiting]), [['otakudle-one-piece', 100, 0], ['otakudle-dragon-ball', 66, 4]]);
  assert.match(r.sql, /waiting \(slug\): cooler, gogeta, baby, syn-shenron/);
  // A character L04 does not have is skipped and listed.
  const none = run({ l04: new Set() });
  assert.deepEqual(none.games.map((g) => [g.loaded, g.waiting]), [[0, 100], [0, 70]]);
  assert.match(none.sql, /waiting \(slug\): monkey-d-luffy,/);
});

test('same input, same output; --targets none flags nobody; complete flags only a character with every column and the hint', () => {
  assert.equal(run().sql, run().sql);
  const none = run({ targets: 'none' });
  assert.ok(none.games.every((g) => g.targets === 0));
  assert.ok(!/, true\) on conflict/.test(none.sql));
  const all = run();
  assert.ok(all.games.every((g) => g.targets === g.complete));
});

test('Dragon Ball: a voice actor stands in for a missing technique; without the file those characters are not targets and are listed', () => {
  const without = run();
  const noHint = without.games[1].noHint;
  assert.ok(noHint.length > 0);
  assert.match(without.sql, /all-series\.json is not there/);
  const voices = new Map(noHint.map((slug) => [slug, { value: `Voice of ${slug}`, status: 'agree', sources: [{ source: 'wikidata_P725', url: 'https://www.wikidata.org/wiki/Q1', value: `Voice of ${slug}` }], ch: { ids: { wikidata_qid: 'Q1' } } }]));
  const with_ = run({ voices });
  assert.equal(with_.games[1].noHint.length, 0);
  assert.ok(with_.games[1].targets >= without.games[1].targets);
  assert.ok(with_.sql.includes('"voice_actor_ja":"Voice of '));
  assert.ok(with_.sql.includes("'dragon-ball.voice_actor_ja'"));
  assert.equal(loadVoices('/nonexistent/all-series.json'), null);
});

test('values: no bounty is 0, no haki is none, no fruit has no name (the view says No Devil Fruit), Daima is series 5', () => {
  const sql = run().sql;
  assert.ok(sql.includes('"bounty":{"v":0,"l":"No bounty"}'));
  assert.ok(sql.includes('"haki":{"v":["none"]}'));
  assert.ok(sql.includes('"debut_arc":{"v":'));
  assert.ok(!/No Devil Fruit/.test(sql.replace(/^--.*$/gm, '')));
});

test('every stored value has a source, and no dash of the banned kind is written', () => {
  const r = run();
  assert.ok(!/[–—]/.test(r.sql + r.rollback));
  assert.ok(r.sql.split('\n').filter((l) => l.startsWith('insert into public.entity_sources')).length > 500);
});
