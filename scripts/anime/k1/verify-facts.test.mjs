// node --test scripts/anime/k1/   (temp files only)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyFacts, lacksSecondSource } from './verify-facts.mjs';

const src = (source) => ({ source, url: `https://example.org/${source}`, fetched_at: '2026-10-20T10:00:00Z' });
const fact = (id, over = {}) => ({ id, site: 'anime', value: 'v', load_bearing: false, sources: [src('wikipedia')], status: 'draft', excerpt: 'x', ...over });
function dir(facts) {
  const d = mkdtempSync(join(tmpdir(), 'k1-verify-')); mkdirSync(join(d, 'facts'));
  writeFileSync(join(d, 'facts', 'a.json'), JSON.stringify(facts, null, 2) + '\n');
  return d;
}

test('dry run writes nothing; apply verifies every non-rejected fact and never touches a rejected one', () => {
  const d = dir([fact('a-1'), fact('a-2', { status: 'rejected' }), fact('a-3', { status: 'verified', verified_at: '2026-10-01T00:00:00Z' })]);
  const before = readFileSync(join(d, 'facts', 'a.json'), 'utf8');
  const dry = verifyFacts(d, { now: '2026-10-23T12:00:00Z' });
  assert.equal(dry.toVerify, 1); assert.equal(dry.rejected, 1); assert.equal(dry.alreadyVerified, 1);
  assert.equal(readFileSync(join(d, 'facts', 'a.json'), 'utf8'), before);
  verifyFacts(d, { apply: true, now: '2026-10-23T12:00:00Z' });
  const after = JSON.parse(readFileSync(join(d, 'facts', 'a.json'), 'utf8'));
  assert.deepEqual(after.map((f) => f.status), ['verified', 'rejected', 'verified']);
  assert.equal(after[0].verified_at, '2026-10-23T12:00:00Z');
  assert.equal(after[1].verified_at, undefined);
  assert.equal(after[2].verified_at, '2026-10-01T00:00:00Z');
  assert.deepEqual(Object.keys(after[0]).slice(-3), ['status', 'verified_at', 'excerpt']);
  assert.equal(verifyFacts(d, { apply: true }).toVerify, 0);
});

test('a load bearing fact without a second Wikidata or official source is listed, and held with --hold-single-source', () => {
  assert.equal(lacksSecondSource(fact('x', { load_bearing: true })), true);
  assert.equal(lacksSecondSource(fact('x', { load_bearing: true, sources: [src('wikipedia'), src('wikidata')] })), false);
  assert.equal(lacksSecondSource(fact('x', { load_bearing: true, sources: [src('wikipedia'), { ...src('wikipedia'), url: 'https://example.org/b' }] })), true);
  const d = dir([fact('a-1', { load_bearing: true }), fact('a-2')]);
  const r = verifyFacts(d, { apply: true, holdSingleSource: true });
  assert.deepEqual(r.singleSource, ['a-1']); assert.equal(r.draftHeld, 1); assert.equal(r.toVerify, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(d, 'facts', 'a.json'), 'utf8')).map((f) => f.status), ['draft', 'verified']);
});

test('owner rule C2: Oricon is a strong second source for a copies fact, ANN for a season fact, and not the other way round', () => {
  const press = (host) => ({ source: 'press', url: `https://${host}/x`, fetched_at: '2026-10-20T10:00:00Z' });
  const wp = { source: 'wikipedia', url: 'https://en.wikipedia.org/wiki/X', ref: '1', fetched_at: '2026-10-20T10:00:00Z' };
  assert.equal(lacksSecondSource(fact('c', { load_bearing: true, field: 'copies', sources: [wp, press('www.oricon.co.jp')] })), false);
  assert.equal(lacksSecondSource(fact('c', { load_bearing: true, field: 'copies', sources: [wp, press('www.animenewsnetwork.com')] })), true);
  assert.equal(lacksSecondSource(fact('s', { load_bearing: true, field: 'anime_s3', sources: [wp, press('www.animenewsnetwork.com')] })), false);
  assert.equal(lacksSecondSource(fact('s', { load_bearing: true, field: 'anime_s3', sources: [wp, press('www.oricon.co.jp')] })), true);
  assert.equal(lacksSecondSource(fact('d', { load_bearing: true, field: 'director', sources: [wp, press('www.animenewsnetwork.com')] })), true);
});
