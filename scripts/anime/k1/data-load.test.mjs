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
