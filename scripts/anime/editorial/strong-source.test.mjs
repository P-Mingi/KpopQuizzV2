// Run O1, lane K1: rule C2 of 2026-10-24, which press source is strong for which fact field.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/schema.mjs';
import { SALES_FIELDS, ANNOUNCEMENT_FIELDS, OTHER_FIELDS, fieldGroup, isListedField, isStrongSource, meetsTwoSourceRule } from './lib/strong-source.mjs';
import { sourcingProblems } from './lib/checks-a.mjs';

const ORICON = 'https://www.oricon.co.jp/news/2447276/full/';
const ANN = 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=18459';
const src = (source, url) => ({ source, url, fetched_at: '2026-10-20T10:00:00Z', ...(source === 'wikipedia' ? { ref: '123' } : {}) });
const wiki = src('wikipedia', 'https://en.wikipedia.org/wiki/X');
const fact = (field, sources, over = {}) => ({ id: `x-${field}`, field, load_bearing: true, status: 'draft', sources, ...over });

test('the three groups do not overlap and every field of the facts files is in one of them', () => {
  const all = [...SALES_FIELDS, ...ANNOUNCEMENT_FIELDS, ...OTHER_FIELDS];
  assert.equal(new Set(all).size, all.length, 'a field is in two groups');
  const dir = join(REPO_ROOT, 'docs/anime/data/facts');
  if (!existsSync(dir)) return;
  const unlisted = new Set();
  for (const n of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const f of JSON.parse(readFileSync(join(dir, n), 'utf8'))) if (!isListedField(f.field)) unlisted.add(f.field);
  }
  assert.deepEqual([...unlisted], [], 'file these fields in strong-source.mjs');
});

test('the sales list: Oricon is strong on a sales figure, ANN is not', () => {
  for (const field of SALES_FIELDS) {
    assert.equal(fieldGroup(field), 'sales');
    assert.equal(isStrongSource(src('press', ORICON), fact(field)), true, field);
    assert.equal(isStrongSource(src('press', ANN), fact(field)), false, field);
  }
});

test('the announcement list: ANN is strong on a date, season or adaptation, Oricon is not', () => {
  for (const field of ANNOUNCEMENT_FIELDS) {
    assert.equal(fieldGroup(field), 'announcement');
    assert.equal(isStrongSource(src('press', ANN), fact(field)), true, field);
    assert.equal(isStrongSource(src('press', ORICON), fact(field)), false, field);
  }
});

test('the other list: no press source is strong; staff, director, artist, publisher, magazine, award, episode counts are other', () => {
  for (const field of OTHER_FIELDS) {
    assert.equal(fieldGroup(field), 'other');
    assert.equal(isStrongSource(src('press', ANN), fact(field)), false, field);
    assert.equal(isStrongSource(src('press', ORICON), fact(field)), false, field);
  }
  for (const field of ['staff', 'director', 'artist', 'publisher', 'publisher_na', 'magazine', 'award', 'awards', 'manga_award', 'episodes', 'anime_total', 'chapters', 'volumes']) {
    assert.equal(fieldGroup(field), 'other', field);
  }
  assert.equal(fieldGroup('a_new_field'), 'other');
});

test('wikidata and official stay strong for every field', () => {
  for (const field of ['copies', 'anime_s3', 'director', 'a_new_field']) {
    assert.equal(isStrongSource(src('wikidata', 'https://www.wikidata.org/wiki/Q1'), fact(field)), true);
    assert.equal(isStrongSource(src('official', 'https://example.jp/'), fact(field)), true);
    assert.equal(isStrongSource(src('wikipedia', wiki.url), fact(field)), false);
  }
});

test('the two rules end to end: a director fact with ANN stays weak, a copies fact with ANN stays weak, a season fact with Oricon stays weak', () => {
  const director = fact('director', [wiki, src('press', ANN)]);
  const copies = fact('copies', [wiki, src('press', 'https://www.animenewsnetwork.com/news/2026-06-30/x/.1')]);
  const season = fact('anime_s3', [wiki, src('press', ORICON)]);
  for (const f of [director, copies, season]) {
    assert.equal(meetsTwoSourceRule(f), false, f.id);
    assert.equal(sourcingProblems(f, { now: '2026-10-24T00:00:00Z' }).warns.length, 1, f.id);
    assert.equal(sourcingProblems({ ...f, status: 'verified' }, { now: '2026-10-24T00:00:00Z' }).fails.length, 1, f.id);
  }
  const good = [fact('copies', [wiki, src('press', ORICON)]), fact('anime_s3', [wiki, src('press', ANN)])];
  for (const f of good) {
    assert.equal(meetsTwoSourceRule(f), true, f.id);
    assert.deepEqual(sourcingProblems({ ...f, status: 'verified' }, { now: '2026-10-24T00:00:00Z' }), { fails: [], warns: [] });
  }
});

test('a press source needs the exact www host and two sources on two pages', () => {
  assert.equal(isStrongSource(src('press', 'https://oricon.co.jp/news/1/'), fact('copies')), false);
  assert.equal(isStrongSource(src('press', 'https://www.animenewsnetwork.com.evil.example/x'), fact('anime_s3')), false);
  assert.equal(meetsTwoSourceRule(fact('copies', [src('press', ORICON)])), false);
});
