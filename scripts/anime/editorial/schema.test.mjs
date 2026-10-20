// Run O1, lane E1a: the JSON Schema validator of C1 agrees with the contract's own examples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTRACT_DIR, loadRegistry, validate } from './lib/schema.mjs';

const registry = loadRegistry();
const SUPPORTED = new Set(['$schema', '$id', '$ref', '$defs', '$comment', 'title', 'description', 'examples', 'type', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems', 'contains', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'minProperties', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else']);

test('every schema of the contract uses only the keywords this validator reads', () => {
  const bad = [];
  const walk = (node, at, inProps) => {
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${at}/${i}`, false)); return; }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (!inProps && !SUPPORTED.has(k)) bad.push(`${at}/${k}`);
      walk(v, `${at}/${k}`, k === 'properties' || k === '$defs');
    }
  };
  for (const [name, doc] of Object.entries(registry)) walk(doc, name, false);
  assert.deepEqual(bad, []);
});

test('the registry holds the schemas the checks need', () => {
  for (const f of ['quiz-draft', 'daily-bank-row', 'fact', 'common', 'anime-question', 'series-fixture']) assert.ok(registry[`${f}.schema.json`], f);
});

test('every question of the contract fixtures validates as an anime question', () => {
  const dir = join(CONTRACT_DIR, 'fixtures/series');
  let n = 0;
  for (const name of readdirSync(dir)) {
    const d = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    for (const q of d.quizzes) for (const [i, question] of q.questions.entries()) {
      const r = validate('anime-question.schema.json', question, registry);
      assert.deepEqual(r.errors, [], `${name} ${q.slug} question ${i + 1}`);
      n += 1;
    }
  }
  assert.ok(n >= 15);
});

test('the contract fixtures validate against the series fixture schema', () => {
  const dir = join(CONTRACT_DIR, 'fixtures/series');
  for (const name of readdirSync(dir)) {
    const d = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    assert.deepEqual(validate('series-fixture.schema.json', d, registry).errors, [], name);
  }
});

test('a good fact passes and planted bad ones fail', () => {
  const good = { id: 'dn-creators-001', site: 'anime', entity: { kind: 'series', group_slug: 'death-note' }, value: 'x', category: 'history', load_bearing: false, spoiler: { arc: 0, scope: 'both' }, sources: [{ source: 'wikipedia', url: 'https://en.wikipedia.org/wiki/Death_Note', ref: '123', fetched_at: '2026-10-04T10:00:00Z' }], status: 'draft' };
  assert.deepEqual(validate('fact.schema.json', good, registry).errors, []);
  const noRev = structuredClone(good); delete noRev.sources[0].ref;
  assert.ok(validate('fact.schema.json', noRev, registry).errors.length > 0);
  const banned = structuredClone(good); banned.sources[0].url = 'https://myanimelist.net/anime/1535';
  assert.ok(validate('fact.schema.json', banned, registry).errors.length > 0);
  const dash = structuredClone(good); dash.value = 'a \u{2013} b';
  assert.ok(validate('fact.schema.json', dash, registry).errors.length === 0, 'value is not plainText: only text is');
  const verified = structuredClone(good); verified.status = 'verified'; verified.verified_at = '2026-10-05T09:00:00Z'; verified.load_bearing = true;
  assert.ok(validate('fact.schema.json', verified, registry).errors.length > 0, 'one source for a verified load bearing fact');
});

test('unknownAsWarning moves additionalProperties errors aside', () => {
  const r = validate('common.schema.json#/$defs/spoiler', { arc: 0, scope: 'both', extra: 1 }, registry, { unknownAsWarning: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
});
