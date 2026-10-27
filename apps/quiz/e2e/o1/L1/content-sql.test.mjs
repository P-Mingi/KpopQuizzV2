// node --test apps/quiz/e2e/o1/L1/content-sql.test.mjs   (no database, no network: in-memory data and a temp folder)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLaunchFiles, cutByKind, generate, parseArgs, selectData, splitStatements, teamEmail } from './content-sql.mjs';
import { buildDataPlan, renderDataSql } from '../../../../../scripts/anime/k1/data-load.mjs';

const SRC = { source: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Test', ref: '123', fetched_at: '2026-10-20T10:00:00Z' };
const fact = (id, text, status) => ({
  id, site: 'anime', entity: { kind: 'series', group_slug: 'test-show' }, field: `f_${id}`, value: 'v', text, category: 'history',
  load_bearing: false, spoiler: { arc: 0, scope: 'both' }, sources: [SRC], status, excerpt: 'x',
});
const q = (n, ids) => ({ question: `Question ${n}?`, options: ['a', 'b', 'c', 'd'], correct: 0, kind: 'production', spoiler: { arc: 0, scope: 'both' }, fact_ids: ids, source_url: SRC.url });
const quiz = (slug, ids) => ({ site: 'anime', account: 'oq_creator_01', group_slug: 'test-show', title: `Title of ${slug}`, slug, description: 'd', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', questions: [q(1, ids), q(2, ids), q(3, ids)] });
const daily = (title, ids) => ({ site: 'anime', title, description: 'd', group_slug: 'anime-mix', quiz_type: 'multiple_choice', difficulty: 'easy', category: 'series_specific',
  questions: Array.from({ length: 8 }, (_, i) => ({ ...q(i, ids), spoiler: { arc: 0, scope: 'both' } })) });

function sample(published = true) {
  return [{
    slug: 'test-show', group: { slug: 'test-show', name: 'Test Show', site: 'anime' },
    series: { type: 'anime_manga', title_en: 'Test Show', status: 'finished', tier: 'B', published },
    arcs: [{ ord: 1, name: 'Part 1', kind: 'part', status: 'published' }, { ord: 2, name: 'Part 2', kind: 'part', status: 'draft' }],
    characters: [{ slug: 'hero', name: 'Hero', role: 'main', spoiler_level: 0, identity_spoiler: false, ord: 1, status: 'published' }],
    themes: [{ kind: 'op', number: 1, title: 'Song', artist: 'Band', status: 'published' }],
    facts: [fact('f1', 'A verified line.', 'verified'), fact('f2', 'A draft line.', 'draft'), fact('f3', 'A rejected line.', 'rejected')],
  }];
}
const extras = () => ({
  creators: [{ site: 'anime', kind: 'series', username: 'oq_creator_01', display_name: 'Mina', bio: 'bio', beat: 'beat', avatar: 'public/brand/anime/creators/oq_creator_01-avatar.svg', header: 'public/brand/anime/creators/oq_creator_01-header.svg' }],
  quizzes: [quiz('good-quiz', ['f1']), quiz('draft-quiz', ['f1', 'f2']), quiz('no-fact-quiz', [])],
  daily: [daily('Daily with a verified fact', ['f1']), daily('Daily with a draft fact', ['f2'])],
});

test('splitStatements keeps newlines inside strings and dollar blocks', () => {
  const sql = "select 'a\nb';\ndo $x$ begin\n  null;\nend $x$;\nselect 2;\n";
  assert.deepEqual(splitStatements(sql), ["select 'a\nb';", 'do $x$ begin\n  null;\nend $x$;', 'select 2;']);
});

test('default mode loads only what is verified', () => {
  const sel = selectData(sample(), extras());
  assert.deepEqual(sel.files[0].facts.map((f) => f.id), ['f1']);
  assert.deepEqual(sel.files[0].arcs.map((a) => a.ord), [1]);
  assert.deepEqual(sel.extras.quizzes.map((x) => x.slug), ['good-quiz']);
  assert.deepEqual(sel.extras.daily.map((x) => x.title), ['Daily with a verified fact']);
  assert.equal(sel.extras.creators.length, 1);
});

test('drafts mode loads draft facts and every row but never a rejected fact', () => {
  const sel = selectData(sample(), extras(), { drafts: true });
  assert.deepEqual(sel.files[0].facts.map((f) => f.id), ['f1', 'f2']);
  assert.equal(sel.files[0].arcs.length, 2);
  assert.equal(sel.extras.quizzes.length, 3);
});

test('an unpublished series is skipped with its quizzes', () => {
  const sel = selectData(sample(false), extras());
  assert.equal(sel.files.length, 0);
  assert.equal(sel.extras.quizzes.length, 0);
});

test('every file has a rollback, no transaction control, no dash, no timestamp', () => {
  const sel = selectData(sample(), extras());
  const { files } = buildLaunchFiles(sel);
  assert.deepEqual(files.map((f) => f.name), ['L02-K2-team-accounts', 'L04-K1-series', 'L05-K1-facts', 'L07-K2-catalogue', 'L08-K3-daily-bank', 'L12-L1-sites-live']);
  for (const f of files) {
    for (const text of [f.sql, f.rollback]) {
      assert.ok(text.length > 100, f.name);
      assert.doesNotMatch(text, /^(begin|commit);$/m, f.name);
      assert.doesNotMatch(text, /^\\set /m, f.name);
      assert.doesNotMatch(text, /[\u2013\u2014]/, f.name);
    }
    assert.match(f.sql, /o1-transaction: single/);
  }
});

test('the files hold only their own statements', () => {
  const { files } = buildLaunchFiles(selectData(sample(), extras()));
  const by = Object.fromEntries(files.map((f) => [f.name, f.sql]));
  assert.doesNotMatch(by['L04-K1-series'], /public\.trivia|entity_sources|public\.quizzes|quiz_bank/);
  assert.doesNotMatch(by['L05-K1-facts'], /delete from public\.(arcs|characters|series_themes)|insert into public\.(series|arcs|characters|quizzes)/);
  assert.doesNotMatch(by['L07-K2-catalogue'], /public\.trivia|insert into public\.series/);
  assert.match(by['L02-K2-team-accounts'], /create_profile_for_site/);
  assert.match(by['L02-K2-team-accounts'], /update public\.sites set fallback_group_slug = 'anime-mix' where id = 'anime'/);
  assert.match(by['L04-K1-series'], /anime-mix/);
  assert.match(by['L08-K3-daily-bank'], /insert into public\.quiz_bank/);
  assert.match(by['L12-L1-sites-live'], /status = 'live'/);
});

test('a verified fact becomes published trivia, a draft stays draft', () => {
  const { files } = buildLaunchFiles(selectData(sample(), extras(), { drafts: true }));
  const l05 = files.find((f) => f.name === 'L05-K1-facts').sql;
  assert.match(l05, /'A verified line\.', 'history', 'wikipedia', 'https:\/\/en\.wikipedia\.org\/wiki\/Test', 'published'\)/);
  assert.match(l05, /'A draft line\.', 'history', 'wikipedia', 'https:\/\/en\.wikipedia\.org\/wiki\/Test', 'draft'\)/);
  assert.doesNotMatch(l05, /A rejected line/);
  // a draft row left by an earlier run is promoted when its fact is verified now, and never demoted
  assert.match(l05, /update public\.trivia t set status = 'published'[^\n]*v\.status = 'published' and t\.status = 'draft' and t\.created_by is null;/);
  assert.doesNotMatch(l05, /set status = '(draft|hidden)'/);
});

test('the cut covers the whole loader output and is deterministic', () => {
  const sel = selectData(sample(), extras());
  const sql = renderDataSql(buildDataPlan(sel.files, sel.extras));
  const by = cutByKind(sql);
  assert.equal(Object.values(by).reduce((n, l) => n + l.length, 0), splitStatements(sql).length);
  assert.equal(JSON.stringify(buildLaunchFiles(sel).files), JSON.stringify(buildLaunchFiles(selectData(sample(), extras())).files));
});

test('an unknown loader statement is refused', () => {
  assert.throws(() => cutByKind('drop table x;'), /unknown statement/);
});

test('rollbacks refuse when data was written', () => {
  const { files } = buildLaunchFiles(selectData(sample(), extras()));
  const rb = Object.fromEntries(files.map((f) => [f.name, f.rollback]));
  assert.match(rb['L07-K2-catalogue'], /play_count > 0/);
  assert.match(rb['L08-K3-daily-bank'], /scheduled_date is not null or published_quiz_id is not null/);
  assert.match(rb['L04-K1-series'], /raise exception 'L04 rollback refused/);
  assert.match(rb['L02-K2-team-accounts'], /raise exception 'L02 rollback refused/);
});

test('teamEmail and the arguments', () => {
  assert.equal(teamEmail('oq_creator_01'), 'oq_creator_01@team.otakuquiz.org');
  assert.equal(parseArgs([]).out, 'docs/pending-migrations/multisite/launch');
  assert.equal(parseArgs(['--drafts']).out, 'docs/pending-migrations/multisite/launch');
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
});

test('the real data folder generates in both modes and the manifest matches the bytes', () => {
  for (const drafts of [false, true]) {
    const out = mkdtempSync(join(tmpdir(), 'o1-l1-'));
    const r = generate({ data: 'docs/anime/data', out, drafts, teamDomain: 'otakuquiz.org' });
    assert.equal(r.counts.groups, 50);
    assert.equal(r.counts.creators, 31);
    assert.ok(readdirSync(out).includes('MANIFEST.json'));
    const manifest = JSON.parse(readFileSync(join(out, 'MANIFEST.json'), 'utf8'));
    assert.match(manifest.input_sha256, /^[0-9a-f]{64}$/);
    for (const f of manifest.files) assert.equal(createHash('sha256').update(readFileSync(join(out, f.name))).digest('hex'), f.sha256);
    if (drafts) {
      // D-109: 12 quizzes and 1 daily row withdrawn (docs/anime/data/withdrawn), owner rule of 2026-10-24.
      assert.equal(r.counts.quizzes, 268);
      assert.equal(r.counts.daily, 99);
      assert.match(readFileSync(join(out, 'L07-K2-catalogue.sql'), 'utf8'), /^-- DRAFTS/);
    } else {
      assert.doesNotMatch(readFileSync(join(out, 'L04-K1-series.sql'), 'utf8'), /^-- DRAFTS/);
    }
  }
});
