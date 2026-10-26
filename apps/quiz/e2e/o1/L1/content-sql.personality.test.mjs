// node --test apps/quiz/e2e/o1/L1/content-sql.personality.test.mjs   (no database, no network: in-memory data and a temp folder)
// Run O1, lane PERS: the launch file of the Which character are you quizzes (L10-PERS-personality) and what selects its rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLaunchFiles, cutByKind, generate, selectData, splitStatements } from './content-sql.mjs';
import { buildDataPlan, renderDataSql } from '../../../../../scripts/anime/k1/data-load.mjs';

// The real Death Note files (a quiz must pass the loader's own checks to be selected), with the flags a case needs changed.
const DATA = new URL('../../../../../docs/anime/data/', import.meta.url);
const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, DATA), 'utf8'));
const series = (published = true, charStatus = 'published') => {
  const s = { slug: 'death-note', ...readJson('series/death-note.json'), facts: [] };
  s.series.published = published;
  s.characters.find((c) => c.slug === 'kanzo-mogi').status = charStatus;
  return s;
};
const doc = (status = 'published') => ({ ...readJson('personality/death-note.json'), status });
const extras = (d = doc()) => ({ creators: [], quizzes: [], daily: [], personality: [{ file: 'personality/death-note.json', slug: 'death-note', ...d }] });

test('a published quiz of a loaded series is selected, with its report line', () => {
  const sel = selectData([series()], extras());
  assert.equal(sel.extras.personality.length, 1);
  assert.deepEqual(sel.report.personality, { total: 1, loaded: 1 });
});

test('a draft quiz stays out of the verified run and goes into the drafts run', () => {
  assert.equal(selectData([series()], extras(doc('draft'))).extras.personality.length, 0);
  assert.deepEqual(selectData([series()], extras(doc('draft'))).report.personality, { total: 1, loaded: 0 });
  assert.equal(selectData([series()], extras(doc('draft')), { drafts: true }).extras.personality.length, 1);
});

test('a quiz of an unpublished series is skipped, and so is one that loses characters below the six the route opens at', () => {
  assert.equal(selectData([series(false)], extras()).extras.personality.length, 0);
  assert.equal(selectData([series(true, 'draft')], extras()).extras.personality.length, 0, 'a draft character is not loaded, five profiles are left');
  assert.equal(selectData([series(true, 'draft')], extras(), { drafts: true }).extras.personality.length, 1);
});

test('a run without any quiz reports none and writes no L10', () => {
  const sel = selectData([series()], { creators: [], quizzes: [], daily: [] });
  assert.equal('personality' in sel.report, false);
  assert.equal(buildLaunchFiles(sel).files.some((f) => f.name.startsWith('L10')), false);
});

test('L10 holds the guards, the quiz rows and its own rollback, between L08 and L12', () => {
  const { files, counts } = buildLaunchFiles(selectData([series()], extras()));
  assert.deepEqual(files.map((f) => f.name), ['L04-K1-series', 'L05-K1-facts', 'L10-PERS-personality', 'L12-L1-sites-live']);
  assert.equal(counts.personality_questions, 8);
  assert.equal(counts.personality_profiles, 6);
  const l10 = files.find((f) => f.name === 'L10-PERS-personality');
  assert.match(l10.sql, /Needs:  L04, 002a, 013\./);
  assert.match(l10.sql, /expect 6/);
  assert.match(l10.sql, /o1-transaction: single/);
  assert.match(l10.sql, /raise exception 'L10: the series groups are missing \(apply L04 first\)'/);
  assert.match(l10.sql, /raise exception 'L10: the characters of death-note are missing \(apply L04 first\)'/);
  assert.match(l10.sql, /personality_profiles\.character_id is missing \(apply SQL 013 first\)/);
  assert.equal((l10.sql.match(/^insert into public\.personality_questions/gm) ?? []).length, 8);
  assert.equal((l10.sql.match(/^insert into public\.personality_profiles/gm) ?? []).length, 6);
  assert.doesNotMatch(l10.sql, /public\.(groups|series|characters|trivia|quizzes) \(/);
  assert.doesNotMatch(l10.sql, /^(begin|commit);$/m);
  assert.doesNotMatch(l10.sql + l10.rollback, /[\u2013\u2014]/);
  assert.match(l10.rollback, /delete from public\.personality_questions where site_id = 'anime'/);
  assert.match(l10.rollback, /delete from public\.personality_profiles where site_id = 'anime'/);
  assert.doesNotMatch(l10.rollback, /personality_results/);
  // the other files do not carry a quiz statement
  for (const f of files.filter((x) => x.name !== 'L10-PERS-personality')) assert.doesNotMatch(f.sql, /personality_(questions|profiles)/, f.name);
});

test('the drafts run says DRAFTS on its first line and loads a draft quiz inactive', () => {
  const { files } = buildLaunchFiles(selectData([series()], extras(doc('draft')), { drafts: true }), { drafts: true });
  const l10 = files.find((f) => f.name === 'L10-PERS-personality');
  assert.match(l10.sql.split('\n')[0], /^-- DRAFTS/);
  assert.match(l10.sql, /, false, 'anime'\)/);
});

test('the cut covers the quiz statements too: nothing of the loader is left over', () => {
  const sel = selectData([series()], extras());
  const sql = renderDataSql(buildDataPlan(sel.files, sel.extras));
  const by = cutByKind(sql);
  assert.equal(Object.values(by).reduce((n, l) => n + l.length, 0), splitStatements(sql).length);
  assert.ok(by.personality.length > 14);
  assert.ok(by.personality.every((s) => /personality_|k1p/.test(s)));
});

test('the real data folder: L10 carries the Death Note quiz, and the others files are the same as without it', () => {
  const a = generate({ data: 'docs/anime/data', out: mkdtempSync(join(tmpdir(), 'l10-a-')), drafts: false, teamDomain: 'otakuquiz.org' });
  assert.ok(a.files.includes('L10-PERS-personality'));
  assert.equal(a.counts.personality, 1);
  assert.deepEqual(a.report.personality, { total: 1, loaded: 1 });
  const out = readdirSync(a.outDir);
  assert.ok(out.includes('L10-PERS-personality.sql') && out.includes('L10-PERS-personality.rollback.sql'));
  const manifest = JSON.parse(readFileSync(join(a.outDir, 'MANIFEST.json'), 'utf8'));
  assert.ok(manifest.files.some((f) => f.name === 'L10-PERS-personality.sql'));
  const verify = readFileSync(join(a.outDir, 'content-verify.sql'), 'utf8');
  assert.match(verify, /personality_profiles/);
  assert.equal(JSON.parse(readFileSync(join(a.outDir, 'expected-counts.json'), 'utf8')).counts.personality_profiles, 6);
});
