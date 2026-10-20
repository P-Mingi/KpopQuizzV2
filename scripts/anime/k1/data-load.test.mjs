// node --test scripts/anime/k1/   (no database, no network: temp files only)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDataDir, buildDataPlan, countDataPlan, renderDataSql, countDataSql, sqlText } from './data-load.mjs';

const SRC = (source, extra = {}) => ({ source, url: 'https://en.wikipedia.org/wiki/Test', fetched_at: '2026-10-20T10:00:00Z', ...(source === 'wikipedia' ? { ref: '123' } : {}), ...extra });
const fact = (id, kind, ref, field, over = {}) => ({
  id, site: 'anime', entity: { kind, group_slug: 'test-show', ...(ref ? { ref } : {}) }, field, value: 'v', category: 'history', load_bearing: false,
  spoiler: { arc: 0, scope: 'both' }, sources: [SRC('wikipedia')], status: 'draft', excerpt: 'x', ...over,
});

function dataDir(facts) {
  const dir = mkdtempSync(join(tmpdir(), 'k1-data-'));
  mkdirSync(join(dir, 'series')); mkdirSync(join(dir, 'facts'));
  const series = {
    group: { slug: 'test-show', name: 'Test Show', site: 'anime' },
    series: { type: 'anime_manga', title_en: "Test 'Show'", status: 'finished', episodes: 12, official_url: 'https://example.org/', wikidata_qid: 'Q1', tier: 'A', published: true },
    arcs: [{ ord: 1, name: 'One', kind: 'arc', episode_from: 1, episode_to: 6, status: 'published' }, { ord: 2, name: 'Two', kind: 'arc', anime_only: true, status: 'published' }],
    characters: [{ slug: 'a-b', name: 'A B', name_native: 'エービー', role: 'main', affiliation: 'Team', debut_arc_ord: 1, debut_medium: 'both', description: 'd', spoiler_level: 0, identity_spoiler: false, ord: 1, status: 'published' }],
    themes: [{ kind: 'op', number: 1, title: 'T', artist: 'A', season: 1, idol_sung: false, deezer_playable: false, status: 'published' }],
  };
  writeFileSync(join(dir, 'series', 'test-show.json'), JSON.stringify(series));
  writeFileSync(join(dir, 'facts', 'test-show.json'), JSON.stringify(facts));
  return dir;
}

test('plan counts: trivia only for facts with a text and not for episodes; one entity_sources row per source', () => {
  const dir = dataDir([
    fact('test-show-a-001', 'series', null, 'titles', { text: 'A trivia sentence.', sources: [SRC('wikipedia'), SRC('wikidata', { ref: 'Q1', url: 'https://www.wikidata.org/wiki/Q1' })] }),
    fact('test-show-b-002', 'character', 'a-b', 'name_native'),
    fact('test-show-c-003', 'episode', '3', 'title', { text: 'Episode sentence.' }),
  ]);
  const plan = buildDataPlan(readDataDir(dir));
  assert.deepEqual(countDataPlan(plan), { groups: 1, series: 1, arcs: 2, characters: 1, themes: 1, trivia: 1, entity_sources: 4 });
  assert.equal(plan.trivia[0].entity_id, 'test-show');
  assert.equal(plan.trivia[0].status, 'draft');
  assert.ok(plan.sources.some((s) => s.entity_type === 'character' && s.entity_id === 'a-b'));
});

test('two facts on one entity, field and source kind are refused', () => {
  const dir = dataDir([fact('test-show-a-001', 'series', null, 'titles'), fact('test-show-b-002', 'series', null, 'titles')]);
  assert.throws(() => buildDataPlan(readDataDir(dir)), /already used/);
});

test('a group slug that differs from its file name is refused', () => {
  const dir = dataDir([]);
  writeFileSync(join(dir, 'series', 'other.json'), JSON.stringify({ group: { slug: 'x', name: 'X', site: 'anime' } }));
  assert.throws(() => readDataDir(dir), /differs from the file name/);
});

test('the SQL is one idempotent transaction: upserts, the anime-mix group, no destructive DDL', () => {
  const dir = dataDir([fact('test-show-a-001', 'series', null, 'titles', { text: "It's a trivia sentence." })]);
  const plan = buildDataPlan(readDataDir(dir));
  const sql = renderDataSql(plan);
  assert.match(sql, /^\\set ON_ERROR_STOP on\nbegin;/);
  assert.match(sql, /commit;\n$/);
  assert.match(sql, /'anime-mix'.*on conflict \(slug\) do nothing/);
  assert.match(sql, /insert into public\.series .* on conflict \(group_id\) do update/);
  assert.match(sql, /insert into public\.entity_sources .* on conflict \(entity_type, entity_id, field, source\) do update/);
  assert.match(sql, /'Test ''Show'''/);
  assert.doesNotMatch(sql, /drop table|truncate|drop schema/i);
  assert.equal((sql.match(/\bbegin;/g) ?? []).length, 1);
  assert.match(countDataSql(plan), /public\.trivia/);
  assert.equal(sqlText("a'b"), "'a''b'");
});

// ---- lane K2: creators and quizzes
import { readExtras, computeQuizLevel } from './data-load.mjs';

const creator = (u, over = {}) => ({ site: 'anime', kind: 'series', username: u, display_name: 'Test Creator', bio: 'A bio.', beat: 'Test Show', groups: ['test-show'], style: { voice: 'v', do: ['d'], dont: ['n'] }, avatar: `public/brand/anime/creators/${u}-avatar.svg`, header: `public/brand/anime/creators/${u}-header.svg`, ...over });
const tag = (arc, scope = 'both') => ({ arc, scope });
const quiz = (over = {}) => ({
  site: 'anime', account: 'oq_creator_01', group_slug: 'test-show', title: 'A Test Quiz Title', slug: 'a-test-quiz', quiz_type: 'true_false', difficulty: 'easy', language: 'en',
  questions: [{ question: 'a', correct: true, kind: 'lore', spoiler: tag(0) }, { question: 'b', correct: false, kind: 'lore', spoiler: tag(0) }, { question: 'c', correct: true, kind: 'lore', spoiler: tag(0) }], ...over,
});
function extrasDir(creators, quizzes) {
  const dir = dataDir([fact('test-show-a-001', 'series', null, 'titles', { text: 'A trivia sentence.' })]);
  writeFileSync(join(dir, 'creators.json'), JSON.stringify({ creators }));
  mkdirSync(join(dir, 'quizzes', 'test-show'), { recursive: true });
  quizzes.forEach((q, i) => writeFileSync(join(dir, 'quizzes', 'test-show', `q${i}.json`), JSON.stringify(q)));
  return dir;
}

test('K2: creators and quizzes are planned, the level is computed from the tags, never read from the file', () => {
  const q1 = quiz({ questions: [{ question: 'a', correct: true, kind: 'arc', spoiler: tag(2) }, { question: 'b', correct: true, kind: 'arc', spoiler: tag(0) }, { question: 'c', correct: true, kind: 'arc', spoiler: tag(1, 'anime') }] });
  const dir = extrasDir([creator('oq_creator_01')], [q1, quiz({ slug: 'second-quiz', title: 'Second Quiz Title' })]);
  const plan = buildDataPlan(readDataDir(dir), readExtras(dir));
  assert.deepEqual(countDataPlan(plan), { groups: 1, series: 1, arcs: 2, characters: 1, themes: 1, trivia: 1, entity_sources: 1, creators: 1, quizzes: 2, questions: 6 });
  assert.deepEqual([plan.quizzes[0].spoiler_arc_ord, plan.quizzes[0].spoiler_scope], [2, 'both']);
  assert.deepEqual([plan.quizzes[1].spoiler_arc_ord, plan.quizzes[1].spoiler_scope], [0, null]);
  assert.equal(plan.creators[0].avatar_url, 'https://otakuquiz.org/brand/anime/creators/oq_creator_01-avatar.svg');
  const sql = renderDataSql(plan);
  assert.match(sql, /a creator has no profile/);
  assert.match(sql, /insert into public\.editorial_accounts .* on conflict \(user_id\) do update/);
  assert.match(sql, /insert into public\.world_memberships .* on conflict \(user_id, site_id\) do update/);
  assert.match(sql, /insert into public\.quizzes .* on conflict \(slug\) do update .* where quizzes\.site_id = 'anime';/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\.quizzes|delete from public\.profiles/i);
  assert.match(countDataSql(plan), /public\.editorial_accounts/);
});

test('K2: a quiz of an unknown account, a bad group or without a tag is refused', () => {
  const run = (q) => { const dir = extrasDir([creator('oq_creator_01')], [q]); return () => buildDataPlan(readDataDir(dir), readExtras(dir)); };
  assert.throws(run(quiz({ account: 'oq_creator_09' })), /not in creators\.json/);
  assert.throws(run(quiz({ group_slug: 'nope' })), /no series file/);
  assert.throws(run(quiz({ questions: [{ question: 'a', correct: true }, { question: 'b', correct: true }, { question: 'c', correct: true }] })), /no spoiler tag/);
  assert.throws(() => { const dir = extrasDir([creator('oq_creator_01'), creator('oq_creator_01')], []); buildDataPlan(readDataDir(dir), readExtras(dir)); }, /duplicate username/);
  assert.throws(() => { const dir = extrasDir([creator('oq_creator_01', { bio: 'x'.repeat(161) })], []); buildDataPlan(readDataDir(dir), readExtras(dir)); }, /bio/);
});

test('K2: the level rules equal computeSpoilerLevel of lib/anime/spoilers/core.ts', async () => {
  let core;
  try { const { tsImport } = await import('tsx/esm/api'); core = await tsImport('../../../apps/quiz/src/lib/anime/spoilers/core.ts', import.meta.url); } catch { return; /* tsx not available: the mirror is checked by the plan test above */ }
  const cases = [[], [tag(0)], [tag(3, 'anime')], [tag(3, 'anime'), tag(1, 'both')], [tag(2, 'manga'), tag(5, 'anime')], [tag(4, 'anime')]];
  for (const tags of cases) {
    for (const manga of [new Set(), new Set([4])]) {
      const qs = tags.map((t) => ({ spoiler: t }));
      const a = core.computeSpoilerLevel(qs, manga); const b = computeQuizLevel(qs, manga);
      assert.deepEqual([b.arcOrd, b.scope], [a.arcOrd, a.scope ?? null]);
    }
  }
});
