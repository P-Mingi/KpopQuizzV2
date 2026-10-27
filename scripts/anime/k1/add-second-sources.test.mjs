// Run O1, lane K1: the rules a recorded second source must meet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSource } from './add-second-sources.mjs';

const ok = { source: 'official', url: 'https://example.jp/work', fetched_at: '2026-10-23T10:00:00Z', excerpt: '全20巻', check: 'The publisher page lists twenty volumes.' };

test('an official source with a short excerpt and a check passes', () => assert.deepEqual(validateSource(ok), []));
test('a Wikidata source needs a QID and a wikidata.org host', () => {
  assert.match(validateSource({ ...ok, source: 'wikidata', url: 'https://www.wikidata.org/wiki/Q1' }).join(), /ref = QID/);
  assert.deepEqual(validateSource({ ...ok, source: 'wikidata', url: 'https://www.wikidata.org/wiki/Q1', ref: 'Q1' }), []);
  assert.match(validateSource({ ...ok, source: 'wikidata', url: 'https://example.org/Q1', ref: 'Q1' }).join(), /not a wikidata host/);
});
test('press is Oricon or Anime News Network only', () => {
  assert.deepEqual(validateSource({ ...ok, source: 'press', url: 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=1' }), []);
  assert.deepEqual(validateSource({ ...ok, source: 'press', url: 'https://www.oricon.co.jp/news/1/' }), []);
  assert.match(validateSource({ ...ok, source: 'press', url: 'https://example.org/news' }).join(), /not a press host/);
});
test('banned hosts, http, dashes and long excerpts are refused', () => {
  assert.match(validateSource({ ...ok, url: 'https://myanimelist.net/anime/1' }).join(), /banned/);
  assert.match(validateSource({ ...ok, url: 'http://example.jp/a' }).join(), /not https/);
  assert.match(validateSource({ ...ok, check: 'It lists 20 – not 21 volumes.' }).join(), /dash/);
  assert.match(validateSource({ ...ok, excerpt: 'x'.repeat(161) }).join(), /excerpt/);
});
