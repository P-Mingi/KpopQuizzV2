import { describe, expect, it } from 'vitest';

import { DAILY_RUN_LIMIT } from './constants';
import { canStartRun, nextUtcDayStart, runsLeftToday, utcDayStart } from './limits';

describe('15 ranked runs a day', () => {
  it('the limit is 15', () => {
    expect(DAILY_RUN_LIMIT).toBe(15);
  });

  it.each([
    [0, 15, true],
    [3, 12, true], // "12 of 15 runs left today"
    [14, 1, true],
    [15, 0, false],
    [16, 0, false],
  ])('%i started today -> %i left, can start: %s', (started, left, can) => {
    expect(runsLeftToday(started)).toBe(left);
    expect(canStartRun(started)).toBe(can);
  });

  it('rejects impossible counts', () => {
    expect(() => runsLeftToday(-1)).toThrow(RangeError);
  });

  it('the day is the UTC day (same as the daily blindtest)', () => {
    const now = new Date('2026-09-25T23:59:59.999Z');
    expect(utcDayStart(now).toISOString()).toBe('2026-09-25T00:00:00.000Z');
    expect(nextUtcDayStart(now).toISOString()).toBe('2026-09-26T00:00:00.000Z');
    expect(utcDayStart(new Date('2026-09-26T00:00:00Z')).toISOString()).toBe('2026-09-26T00:00:00.000Z');
  });
});
