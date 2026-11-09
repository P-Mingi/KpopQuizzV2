import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSchedule, pickSchedule, difficultyMix, addDays } from './schedule-rules.mjs';

const d = (date, series, type = 'multiple_choice', difficulty = 'medium') => ({ date, series, type, difficulty });

test('a valid run has no violation', () => {
  assert.deepEqual(checkSchedule([d('2026-11-21', 'a'), d('2026-11-22', 'b'), d('2026-11-23', 'c')]), []);
});
test('the same series within 4 days is refused, 5 days apart is fine', () => {
  assert.equal(checkSchedule([d('2026-11-21', 'a'), d('2026-11-25', 'a')]).length, 1);
  assert.equal(checkSchedule([d('2026-11-21', 'a'), d('2026-11-26', 'a')]).length, 0);
});
test('context days count (Dragon Ball on 2026-11-19)', () => {
  const ctx = [d('2026-11-19', 'dragon-ball'), d('2026-11-20', 'solo-leveling')];
  assert.equal(checkSchedule([...ctx, d('2026-11-22', 'dragon-ball')]).length, 1);
  assert.equal(checkSchedule([...ctx, d('2026-11-24', 'dragon-ball')]).length, 0);
});
test('no two true or false days in a row, nor two hard days', () => {
  assert.equal(checkSchedule([d('2026-11-21', 'a', 'true_false'), d('2026-11-22', 'b', 'true_false')]).length, 1);
  assert.equal(checkSchedule([d('2026-11-21', 'a', 'true_false'), d('2026-11-23', 'b', 'true_false')]).length, 0);
  assert.equal(checkSchedule([d('2026-11-21', 'a', 'multiple_choice', 'hard'), d('2026-11-22', 'b', 'multiple_choice', 'hard')]).length, 1);
});
test('at most one guess_from_clues per 5 days', () => {
  assert.equal(checkSchedule([d('2026-11-21', 'a', 'guess_from_clues'), d('2026-11-25', 'b', 'guess_from_clues')]).length, 1);
  assert.equal(checkSchedule([d('2026-11-21', 'a', 'guess_from_clues'), d('2026-11-26', 'b', 'guess_from_clues')]).length, 0);
});
test('pickSchedule returns a valid order and keeps the mix near the target', () => {
  const series = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const diffs = ['easy', 'easy', 'medium', 'medium', 'medium', 'hard'];
  const cands = series.slice(0, 24).map((s, i) => ({ key: String(i + 1).padStart(2, '0'), series: s, type: i % 6 === 0 ? 'true_false' : 'multiple_choice', difficulty: diffs[i % 6] }));
  const ctx = [d('2026-11-19', 'a'), d('2026-11-20', 'b')];
  const out = pickSchedule(cands, '2026-11-21', ctx);
  assert.equal(out.length, 24);
  assert.equal(out[0].date, '2026-11-21');
  assert.equal(out.at(-1).date, addDays('2026-11-21', 23));
  assert.deepEqual(checkSchedule([...ctx, ...out]), []);
  const mix = difficultyMix(out);
  assert.ok(Math.abs(mix.hard - 1 / 6) < 0.01);
});
test('pickSchedule throws when the rules cannot be met', () => {
  const cands = [1, 2, 3].map((i) => ({ key: String(i), series: 'same', type: 'multiple_choice', difficulty: 'easy' }));
  assert.throws(() => pickSchedule(cands, '2026-11-21'));
});
