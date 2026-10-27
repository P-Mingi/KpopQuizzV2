// node --test scripts/anime/k1/   (no database, no network: temp files only)
// Run O1, lane PERS: the personality quiz data (personality.schema.json, personality-data.mjs) and its place in the loader
// (data-load.mjs, load-fixtures.mjs): the real Death Note file, planted faults, the rows, the SQL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../editorial/lib/schema.mjs';
import { THRESHOLDS } from '../editorial/lib/thresholds.mjs';
import { buildDataPlan, countDataPlan, countDataSql, readDataDir, readExtras, renderDataSql, renderPersonalityOnlySql } from './data-load.mjs';
import {
  AXES, ORD_BAND, ORD_MAX, buildPersonality, characterProblems, countPersonality, distance, nearestProfile, personalityCountColumns, personalityUndoSql,
  readPersonality, renderPersonalitySql, scorePlayer, schemaErrors, sheetShares, shapeProblems, spoilerProblems, textsOf, voiceProblems,
} from './personality-data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const DATA = join(ROOT, 'docs/anime/data');
const registry = loadRegistry();
const clone = (v) => JSON.parse(JSON.stringify(v));
const realDoc = () => JSON.parse(readFileSync(join(DATA, 'personality/death-note.json'), 'utf8'));
const realSeries = () => ({ slug: 'death-note', ...JSON.parse(readFileSync(join(DATA, 'series/death-note.json'), 'utf8')) });

test('the schema is in the registry of the editorial check and the real Death Note file is valid', () => {
  assert.ok(registry['personality.schema.json']);
  assert.equal(registry['personality.schema.json'].$id, 'personality.schema.json');
  assert.deepEqual(schemaErrors(realDoc(), registry), []);
});

test('the schema asks for what the engine reads: eight questions of four answers, 6 to 20 profiles, all six axes, 2 to 4 lines', () => {
  const bad = (edit) => schemaErrors((() => { const d = realDoc(); edit(d); return d; })(), registry).map((e) => `${e.path} ${e.message}`).join(' | ');
  assert.match(bad((d) => { d.questions.length = 7; }), /fewer than 8/);
  assert.match(bad((d) => { d.questions.push(clone(d.questions[0])); }), /more than 8/);
  assert.match(bad((d) => { d.questions[0].options.length = 3; }), /fewer than 4/);
  assert.match(bad((d) => { d.profiles.length = 5; }), /fewer than 6/);
  assert.match(bad((d) => { delete d.profiles[0].traits.care; }), /missing care/);
  assert.match(bad((d) => { d.profiles[0].profile.push('You a.', 'You b.', 'You c.'); }), /more than 4/);
  assert.match(bad((d) => { d.profiles[0].profile[0] = 'x'.repeat(141); }), /longer than 140/);
  assert.match(bad((d) => { d.site = 'kpop'; }), /must equal "anime"/);
  assert.match(bad((d) => { d.status = 'verified'; }), /must be one of/);
  assert.match(bad((d) => { d.spoiler = { arc: -1, scope: 'both' }; }), /below 0/);
  assert.match(bad((d) => { d.questions[0].options[0].weights = {}; }), /fewer than 1 properties/);
  assert.match(bad((d) => { d.questions[0].question = 'Why \u2014 though?'; }), /does not match/);
  assert.match(bad((d) => { d.questions[0].question = 'Why \u{1F600}?'; }), /does not match/);
});

test('the file in the data folder is named after its series, and the loader reads the folder', () => {
  const list = readPersonality(DATA);
  assert.deepEqual(list.map((p) => p.slug), ['apothecary-diaries', 'black-clover', 'death-note', 'inuyasha', 'jujutsu-kaisen', 'kaguya-sama-love-is-war', 'one-piece', 'oshi-no-ko', 'slam-dunk', 'spy-x-family']);
  assert.equal(list.find((p) => p.slug === 'death-note').file, 'personality/death-note.json');
  const dir = mkdtempSync(join(tmpdir(), 'pers-read-'));
  assert.deepEqual(readPersonality(dir), []);
  mkdirSync(join(dir, 'personality'));
  writeFileSync(join(dir, 'personality', 'naruto.json'), JSON.stringify({ group_slug: 'bleach' }));
  assert.throws(() => readPersonality(dir), /group_slug bleach differs from the file name/);
});

test('the engine mirror equals engine.ts: the same player, the same nearest profile, the same shares', async (t) => {
  let engine;
  try { const { tsImport } = await import('tsx/esm/api'); engine = await tsImport('../../../apps/quiz/src/lib/personality/engine.ts', import.meta.url); } catch { t.skip('tsx is not available'); return; }
  const doc = realDoc();
  const profiles = doc.profiles.map((p) => ({ id: p.character_slug, name: p.character_slug, axes: p.traits }));
  const questions = doc.questions.map((q) => ({ text: q.question, options: q.options }));
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 3000; i += 1) {
    const picks = questions.map((q) => rnd(q.options.length));
    assert.deepEqual(scorePlayer(questions, picks), engine.scorePlayer(questions, picks));
    assert.equal(nearestProfile(questions, picks, profiles), engine.nearestProfile(questions, picks, profiles));
  }
  assert.deepEqual(AXES, [...engine.AXIS_KEYS]);
  assert.equal(distance(profiles[0].axes, profiles[1].axes), engine.distance(profiles[0].axes, profiles[1].axes));
  // the unanswered axis stays in the middle, as in the engine
  assert.equal(scorePlayer([{ options: [{ weights: { energy: 5 } }] }], [0]).care, 50);
});

test('reach: every profile of Death Note is the result of between 3 and 40 percent of the 65536 answer sheets', () => {
  const doc = realDoc();
  const shares = sheetShares(doc.questions, doc.profiles.map((p) => ({ id: p.character_slug, axes: p.traits })));
  assert.equal(Object.keys(shares).length, 6);
  assert.ok(Math.abs(Object.values(shares).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  for (const [id, s] of Object.entries(shares)) {
    assert.ok(s >= THRESHOLDS.personality_min_share, `${id} ${s}`);
    assert.ok(s <= THRESHOLDS.personality_max_share, `${id} ${s}`);
  }
  assert.deepEqual(shapeProblems(doc).fails, []);
  assert.throws(() => sheetShares(new Array(11).fill({ options: [1, 2, 3, 4] }), []), /more than the reach test walks/);
});

test('shape: planted faults are named', () => {
  const doc = realDoc();
  const p = (edit) => { const d = clone(doc); edit(d); return shapeProblems(d).fails.map((f) => `${f.path} ${f.message}`).join(' | '); };
  assert.match(p((d) => { d.questions[3].ord = 9; }), /ord must run 1 to 8/);
  assert.match(p((d) => { d.profiles[2].ord = d.profiles[1].ord; }), /ord 2 appears twice/);
  assert.match(p((d) => { d.profiles[0].traits = { ...d.profiles[1].traits }; }), /l is only 0 from light-yagami on the six axes/);
  assert.match(p((d) => { d.profiles[5].traits = { energy: 100, chaos: 100, care: 100, craft: 100, heart: 0, spotlight: 0 }; }), /kanzo-mogi is the result of/);
  assert.match(p((d) => { d.questions[0].options[0].weights = { energy: 1, chaos: 1, care: 1, craft: 1 }; }), /at most three axes/);
  const warn = clone(doc);
  for (const q of warn.questions) for (const o of q.options) delete o.weights.spotlight;
  for (const q of warn.questions) for (const o of q.options) if (Object.keys(o.weights).length === 0) o.weights.energy = 2;
  assert.ok(shapeProblems(warn).warns.some((w) => /axis spotlight is named by 0 answer/.test(w.message)));
});

test('characters, spoilers and voice read the series data', () => {
  const doc = realDoc(); const series = realSeries();
  assert.deepEqual(characterProblems(doc, series), []);
  assert.deepEqual(spoilerProblems(doc, series), []);
  assert.deepEqual(voiceProblems(doc, series), []);
  const d = clone(doc);
  d.profiles[0].character_slug = 'near';
  assert.match(characterProblems(d, null)[0].message, /no series file for death-note/);
  assert.deepEqual(characterProblems(d, series), []); // near is a published character...
  assert.match(spoilerProblems(d, series).map((f) => f.message).join(' | '), /near has spoiler level 2, above the arc 0/);
  assert.match(spoilerProblems(d, series).map((f) => f.message).join(' | '), /near is an identity spoiler/);
  const named = clone(doc);
  named.profiles[0].profile[1] = 'You trust Teru Mikami with your life.';
  assert.match(spoilerProblems(named, series)[0].message, /names Teru Mikami \(spoiler level 2, identity spoiler\)/);
  const arc = clone(doc); arc.spoiler.arc = 2;
  assert.match(spoilerProblems(arc, series).map((f) => f.message).join(' | '), /no spoiler shield/);
  const draft = realSeries(); draft.characters.find((c) => c.slug === 'ryuk').status = 'draft';
  assert.match(characterProblems(doc, draft)[0].message, /ryuk is draft/);
  assert.deepEqual(characterProblems(doc, draft, { requirePublished: false }), []);
  const noYou = clone(doc); noYou.profiles[0].profile[0] = 'Plans ahead.';
  assert.match(voiceProblems(noYou, series)[0].message, /starts with "You"/);
  assert.deepEqual(textsOf(doc).filter((t) => t.role === 'question').length, 8);
  assert.equal(textsOf(doc).filter((t) => t.role === 'option').length, 32);
  assert.equal(textsOf(doc).filter((t) => t.role === 'profile').length, doc.profiles.reduce((n, x) => n + x.profile.length, 0));
});

test('buildPersonality: rows with the name of the character taken from the series, and every fault refused with its file', () => {
  const rows = buildPersonality(readPersonality(DATA).filter((p) => p.slug === 'death-note'), [realSeries()], registry);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'death-note');
  assert.equal(rows[0].status, 'published');
  assert.equal(rows[0].questions.length, 8);
  assert.deepEqual(rows[0].questions.map((q) => q.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(rows[0].profiles.map((x) => x.name), ['Light Yagami', 'L', 'Ryuk', 'Soichiro Yagami', 'Touta Matsuda', 'Kanzo Mogi']);
  assert.deepEqual(countPersonality(rows), { personality: 1, personality_questions: 8, personality_profiles: 6 });
  assert.deepEqual(buildPersonality([], [realSeries()]), []);
  const one = (edit, series = [realSeries()]) => { const d = { file: 'personality/death-note.json', slug: 'death-note', ...realDoc() }; edit(d); return () => buildPersonality([d], series, registry); };
  assert.throws(one((d) => { d.questions.pop(); }), /personality\/death-note\.json: .*fewer than 8/);
  assert.throws(one(() => {}, []), /no series file for death-note/);
  assert.throws(one((d) => { d.profiles[0].character_slug = 'nobody'; }), /no character nobody/);
  assert.throws(one((d) => { d.profiles[0].profile[0] = 'Plans ahead.'; }), /starts with "You"/);
  assert.throws(one((d) => { d.spoiler.arc = 1; }), /no spoiler shield/);
  assert.throws(() => buildPersonality([{ ...realDoc(), file: 'a' }, { ...realDoc(), file: 'b' }], [realSeries()], registry), /two personality files/);
  assert.throws(one((d) => { d.profiles[1].traits = { ...d.profiles[0].traits }; }), /from light-yagami on the six axes/);
});

test('SQL: questions in the band of the group, profiles on (group_id, member_slug), only anime rows touched, stale rows removed, active follows the status', () => {
  const rows = buildPersonality(readPersonality(DATA).filter((p) => p.slug === 'death-note'), [realSeries()], registry);
  const sql = renderPersonalitySql(rows).join('\n');
  assert.equal(renderPersonalitySql([]).length, 0);
  assert.equal((sql.match(/insert into public\.personality_questions/g) ?? []).length, 8);
  assert.equal((sql.match(/insert into public\.personality_profiles/g) ?? []).length, 6);
  assert.match(sql, new RegExp(`\\* ${ORD_BAND} \\+ 8\\)`));
  assert.match(sql, /on conflict \(ord\) do update set question = excluded\.question, options = excluded\.options, active = excluded\.active where personality_questions\.site_id = 'anime'/);
  assert.match(sql, /on conflict \(group_id, member_slug\) do update set member_name = excluded\.member_name, photo_url = null, axes = excluded\.axes, trait_lines = excluded\.trait_lines, ord = excluded\.ord, active = excluded\.active, site_id = excluded\.site_id, character_id = excluded\.character_id where personality_profiles\.site_id = 'anime'/);
  assert.match(sql, /character_id\) values \(\(select id from public\.groups where slug = 'death-note' and site_id = 'anime'\), 'Light Yagami', 'light-yagami', null/);
  assert.match(sql, /\(select id from public\.characters where group_id = \(select id from public\.groups where slug = 'death-note' and site_id = 'anime'\) and slug = 'light-yagami'\)/);
  assert.match(sql, /delete from public\.personality_questions where site_id = 'anime' and ord between .* \* 12 \+ 9 and .* \* 12 \+ 12;/);
  assert.match(sql, /delete from public\.personality_profiles where site_id = 'anime' and group_id = .* and member_slug not in \('light-yagami', 'l', 'ryuk', 'soichiro-yagami', 'touta-matsuda', 'kanzo-mogi'\);/);
  // guards: the columns, the group, the band, another site in the band
  assert.match(sql, /personality_profiles\.character_id is missing \(apply SQL 013 first\)/);
  assert.match(sql, /no group death-note on the anime site/);
  assert.match(sql, new RegExp(`> ${ORD_MAX} then raise exception`));
  assert.match(sql, /a question of another site sits in the band of death-note/);
  // no destructive DDL, no kpop row touched, no transaction control, no dash
  assert.doesNotMatch(sql, /\b(drop|truncate|alter)\b\s+(table|schema|index|column)/i);
  assert.doesNotMatch(sql, /site_id = 'kpop'|begin;|commit;|[\u2013\u2014]/);
  assert.match(sql, /true, 'anime'\)/);
  // a draft is loaded inactive
  const draft = clone(rows); draft[0].status = 'draft';
  const dsql = renderPersonalitySql(draft).join('\n');
  assert.match(dsql, /, false, 'anime'\)/);
  assert.doesNotMatch(dsql, /, true, 'anime', \(select id from public\.characters/);
  // quotes in a text are doubled
  const quote = clone(rows); quote[0].profiles[0].lines = ["You say it's fine.", 'You mean it.'];
  assert.match(renderPersonalitySql(quote).join('\n'), /'You say it''s fine\.'/);
  const nul = clone(rows); nul[0].profiles[0].lines = ['You \u0000 a'];
  assert.throws(() => renderPersonalitySql(nul), /NUL/);
});

test('SQL: the count columns and the undo name only the rows of the series of the plan', () => {
  const rows = buildPersonality(readPersonality(DATA).filter((p) => p.slug === 'death-note'), [realSeries()], registry);
  const cols = personalityCountColumns(rows);
  assert.equal(cols.length, 2);
  assert.match(cols[0], /personality_questions q join public\.groups g on g\.site_id = 'anime' and g\.slug in \('death-note'\) where q\.site_id = 'anime' and q\.ord between g\.id \* 12 \+ 1 and g\.id \* 12 \+ 8/);
  assert.match(cols[1], /personality_profiles where site_id = 'anime' and group_id in/);
  const undo = personalityUndoSql(rows).join('\n');
  assert.match(undo, /delete from public\.personality_questions where site_id = 'anime' and ord between/);
  assert.match(undo, /delete from public\.personality_profiles where site_id = 'anime' and group_id = /);
  assert.doesNotMatch(undo, /personality_results/);
});

// ---------------------------------------------------------------- the loader

function dataDir({ withPersonality = true, edit = () => {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pers-data-'));
  mkdirSync(join(dir, 'series')); mkdirSync(join(dir, 'facts'));
  cpSync(join(DATA, 'series/death-note.json'), join(dir, 'series/death-note.json'));
  cpSync(join(DATA, 'facts/death-note.json'), join(dir, 'facts/death-note.json'));
  if (withPersonality) {
    mkdirSync(join(dir, 'personality'));
    const d = realDoc(); edit(d);
    writeFileSync(join(dir, 'personality/death-note.json'), JSON.stringify(d));
  }
  return dir;
}

test('the loader: the plan holds the quiz, the counts add three numbers, a data folder without one is unchanged', () => {
  const dir = dataDir();
  const plan = buildDataPlan(readDataDir(dir), readExtras(dir));
  assert.equal(plan.personality.length, 1);
  const counts = countDataPlan(plan);
  assert.equal(counts.personality, 1);
  assert.equal(counts.personality_questions, 8);
  assert.equal(counts.personality_profiles, 6);
  const none = dataDir({ withPersonality: false });
  const plain = buildDataPlan(readDataDir(none), readExtras(none));
  assert.deepEqual(plain.personality, []);
  assert.equal('personality' in countDataPlan(plain), false);
  assert.doesNotMatch(renderDataSql(plain), /personality_(questions|profiles)/);
  assert.doesNotMatch(countDataSql(plain), /personality_(questions|profiles)/);
});

test('the loader: the SQL writes the quiz after the characters, inside the one transaction, and the count reads it back', () => {
  const dir = dataDir();
  const plan = buildDataPlan(readDataDir(dir), readExtras(dir));
  const sql = renderDataSql(plan);
  assert.ok(sql.indexOf('insert into public.characters') < sql.indexOf('insert into public.personality_profiles'));
  assert.ok(sql.indexOf('delete from public.characters') < sql.indexOf('insert into public.personality_questions'));
  assert.ok(sql.indexOf('insert into public.personality_questions') < sql.lastIndexOf('commit;'));
  assert.equal((sql.match(/^begin;$/gm) ?? []).length, 1);
  assert.match(countDataSql(plan), /personality_questions q join public\.groups g/);
  const only = renderPersonalityOnlySql(plan);
  assert.match(only, /^\\set ON_ERROR_STOP on\nbegin;/);
  assert.match(only, /commit;\n$/);
  assert.doesNotMatch(only, /public\.(groups|series|arcs|characters|trivia|quizzes) \(/);
  assert.doesNotMatch(only, /insert into public\.groups|insert into public\.characters|insert into public\.trivia/);
  assert.match(only, /insert into public\.personality_profiles/);
  assert.throws(() => renderPersonalityOnlySql(buildDataPlan(readDataDir(dataDir({ withPersonality: false })), readExtras(dataDir({ withPersonality: false })))), /no personality file/);
});

test('the loader: a quiz the check refuses is never loaded', () => {
  for (const [edit, why] of [
    [(d) => { d.profiles[0].character_slug = 'nobody'; }, /no character nobody/],
    [(d) => { d.spoiler.arc = 1; }, /no spoiler shield/],
    [(d) => { d.questions.pop(); }, /fewer than 8/],
    [(d) => { d.profiles[0].profile[0] = 'Light plans.'; }, /starts with "You"/],
  ]) {
    const dir = dataDir({ edit });
    assert.throws(() => buildDataPlan(readDataDir(dir), readExtras(dir)), why);
  }
});

test('load-fixtures: --only personality needs --data, refuses another value, and a dry run touches nothing', () => {
  const run = (...args) => spawnSync(process.execPath, [join(HERE, 'load-fixtures.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, O1_ENV_SH: '/nonexistent/env.sh' } });
  const noData = run('scratch', '--only', 'personality');
  assert.equal(noData.status, 2);
  assert.match(noData.stderr, /usage: load-fixtures\.mjs/);
  const bad = run('scratch', '--data', DATA, '--only', 'everything');
  assert.equal(bad.status, 2);
  const production = run('prod', '--data', DATA, '--only', 'personality');
  assert.equal(production.status, 2);
  assert.match(production.stderr, /the target must be scratch or dev/);
  const dry = run('scratch', '--data', DATA, '--only', 'personality', '--dry-run');
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /personality=10 personality_questions=80 personality_profiles=70/);
  assert.match(dry.stdout, /dry-run: nothing written/);
});
