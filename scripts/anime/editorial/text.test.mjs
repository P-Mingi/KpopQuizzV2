// Run O1, lane E1a: the text helpers the checks stand on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containment, diceTrigrams, hash32, jaccard, longestRun, ngrams, normalize, quotedSegments, rng, shapeOf, walkKeys, walkStrings, words } from './lib/text.mjs';
import { DASH_RE, EMOJI_RE } from './lib/text.mjs';

test('normalize ignores case, accents, punctuation and possessives', () => {
  assert.equal(normalize("What's up, people?!"), 'what up people');
  assert.equal(normalize('Shueisha\u{2019}s  Weekly Shonen Jump'), 'shueisha weekly shonen jump');
  assert.equal(normalize('Caf\u{e9} Pok\u{e9}mon'), 'cafe pokemon');
  assert.deepEqual(words('  '), []);
});

test('n-gram containment, longest run and Jaccard', () => {
  const a = words('the quick brown fox jumps over the lazy dog');
  const b = words('a quick brown fox jumps over a fence');
  assert.equal(longestRun(a, b), 5);
  assert.equal(containment(a, b, 4), 2 / 6);
  assert.equal(containment(words('one two'), b, 4), 0);
  assert.equal(jaccard(['a', 'b'], ['b', 'c']), 1 / 3);
  assert.equal(ngrams(a, 4).size, 6);
});

test('trigram Dice is 1 for equal strings and low for unrelated ones', () => {
  assert.equal(diceTrigrams('death note quiz', 'death note quiz'), 1);
  assert.ok(diceTrigrams('death note quiz', 'one piece crew') < 0.3);
});

test('dash and emoji detection', () => {
  for (const s of ['a \u{2013} b', 'a \u{2014} b', 'a -- b', 'a \u{2212} b']) assert.ok(DASH_RE.test(s), s);
  for (const s of ['a-b', 'a - b', 'well-known']) assert.ok(!DASH_RE.test(s), s);
  for (const s of ['x \u{1F600}', '\u{1F1EF}\u{1F1F5}', '1\u{fe0f}\u{20e3}', '\u{2764}\u{fe0f}']) assert.ok(EMOJI_RE.test(s), s);
  for (const s of ['Death Note', '\u{30c7}\u{30b9}\u{30ce}\u{30fc}\u{30c8}', "What's up?!"]) assert.ok(!EMOJI_RE.test(s), s);
});

test('quoted segments in straight, curly, guillemet and corner quotes', () => {
  assert.deepEqual(quotedSegments('He said "one" and \u{201c}two\u{201d} and \u{ab}three\u{bb} and \u{300c}four\u{300d}.'), ['one', 'two', 'three', 'four']);
  assert.deepEqual(quotedSegments("It's fine, no quotes."), []);
});

test('shapes of answers', () => {
  assert.equal(shapeOf('2006'), 'year');
  assert.equal(shapeOf('1000'), 'number');
  assert.equal(shapeOf('37'), 'number');
  assert.equal(shapeOf('Takeshi Obata'), 'name');
  assert.equal(shapeOf('a notebook'), 'phrase');
});

test('the seeded generator repeats and spreads', () => {
  const a = rng('seed'); const b = rng('seed');
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(rng('seed')(), rng('seed2')());
  assert.equal(hash32('x'), hash32('x'));
});

test('walkers visit every string with its pointer and every key', () => {
  const seen = []; const keys = [];
  walkStrings({ a: ['x', { b: 'y' }] }, (s, p, k) => seen.push([s, p, k]));
  walkKeys({ a: [{ b: 1 }] }, (k, p) => keys.push([k, p]));
  assert.deepEqual(seen, [['x', '/a/0', 'a'], ['y', '/a/1/b', 'b']]);
  assert.deepEqual(keys, [['a', '/a'], ['b', '/a/0/b']]);
});
