import { describe, it, expect } from 'vitest';

import { pickDaily, pickDailyMany } from './daily-rotation';

const DAY = 86_400_000;

describe('pickDaily', () => {
  it('is deterministic within a UTC day and rotates across days', () => {
    const items = ['a', 'b', 'c'];
    const t = 10 * DAY + 5_000; // day index 10 -> 10 % 3 = 1 -> 'b'
    expect(pickDaily(items, t)).toBe('b');
    expect(pickDaily(items, t + 3_600_000)).toBe('b'); // same day
    expect(pickDaily(items, t + DAY)).toBe('c'); // next day rotates
    expect(pickDaily(items, t + 2 * DAY)).toBe('a'); // wraps
  });

  it('returns null on an empty pool', () => {
    expect(pickDaily([], 0)).toBeNull();
  });
});

describe('pickDailyMany (blind-test band answers)', () => {
  const pool = ['s0', 's1', 's2', 's3', 's4'];

  it('picks n consecutive items from the day index and is stable within the day', () => {
    const t = 10 * DAY; // start index 10 % 5 = 0
    expect(pickDailyMany(pool, 4, t)).toEqual(['s0', 's1', 's2', 's3']);
    expect(pickDailyMany(pool, 4, t + 3_600_000)).toEqual(['s0', 's1', 's2', 's3']);
  });

  it('rotates by one each UTC day', () => {
    const t = 10 * DAY;
    expect(pickDailyMany(pool, 4, t + DAY)).toEqual(['s1', 's2', 's3', 's4']);
    expect(pickDailyMany(pool, 4, t + 2 * DAY)).toEqual(['s2', 's3', 's4', 's0']); // wraps
  });

  it('never returns more than the pool holds and never repeats within a pick', () => {
    const small = ['x', 'y'];
    const got = pickDailyMany(small, 4, 3 * DAY);
    expect(got).toHaveLength(2);
    expect(new Set(got).size).toBe(got.length);
  });

  it('is empty for an empty pool or a non-positive count', () => {
    expect(pickDailyMany([], 4, 0)).toEqual([]);
    expect(pickDailyMany(pool, 0, 0)).toEqual([]);
  });
});
