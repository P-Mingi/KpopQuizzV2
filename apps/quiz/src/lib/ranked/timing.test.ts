import { describe, expect, it } from 'vitest';

import { validateAnswerTiming } from './timing';

import type { TimingRejection } from './timing';

describe('impossible timings are rejected', () => {
  it.each<[string, number | null, number | null, number, TimingRejection]>([
    ['faster than a human (299 ms)', 1, 299, 1_000, 'too_fast'],
    ['0 ms', 0, 0, 500, 'too_fast'],
    ['after the 10 s timer', 2, 10_001, 10_500, 'over_round'],
    ['more time than the server saw', 0, 5_000, 4_000, 'ahead_of_server'],
    ['1 ms beyond the clock tolerance', 0, 4_251, 4_000, 'ahead_of_server'],
    ['negative', 0, -5, 1_000, 'invalid_time'],
    ['not a number', 0, Number.NaN, 1_000, 'invalid_time'],
    ['infinite', 0, Number.POSITIVE_INFINITY, 1_000, 'invalid_time'],
    ['an answer without a time', 3, null, 1_000, 'invalid_time'],
    ['a broken server clock', 0, 1_000, -1, 'invalid_time'],
  ])('%s', (_label, choice, clientMs, serverElapsedMs, reason) => {
    expect(validateAnswerTiming({ choice, clientMs, serverElapsedMs })).toEqual({ ok: false, reason });
  });
});

describe('accepted timings: effective = max(client, server - 1.5 s allowance)', () => {
  it.each<[string, number | null, number | null, number, number, boolean]>([
    ['honest, fast network', 1, 1_200, 1_500, 1_200, false],
    ['honest, slow clip load', 1, 1_200, 2_600, 1_200, false],
    ['under-reported by the client', 1, 1_200, 3_200, 1_700, false],
    ['at the human floor', 1, 300, 400, 300, false],
    ['at the clock tolerance', 0, 4_250, 4_000, 4_250, false],
    ['decimals round', 0, 1_234.6, 1_500, 1_235, false],
    ['answer at exactly 10 s is a timeout', 0, 10_000, 10_100, 10_000, true],
    ['arrived long after the clip ended: timeout', 2, 1_500, 30_000, 10_000, true],
    ['client timer ran out', null, null, 10_100, 10_000, true],
    ['early give-up counts as a timeout', null, null, 3_000, 10_000, true],
  ])('%s', (_label, choice, clientMs, serverElapsedMs, effectiveMs, timedOut) => {
    expect(validateAnswerTiming({ choice, clientMs, serverElapsedMs })).toEqual({ ok: true, timedOut, effectiveMs });
  });
});
