import { describe, it, expect } from 'vitest';

import { msUntilUtcMidnight, formatCountdown } from './reset-countdown';

const DAY = 86_400_000;

describe('msUntilUtcMidnight', () => {
  it('returns a full day at exactly UTC midnight', () => {
    expect(msUntilUtcMidnight(10 * DAY)).toBe(DAY);
  });

  it('counts down within the day', () => {
    expect(msUntilUtcMidnight(10 * DAY + 1_000)).toBe(DAY - 1_000);
    expect(msUntilUtcMidnight(10 * DAY + DAY - 1)).toBe(1);
  });

  it('is always in (0, DAY]', () => {
    for (const offset of [0, 1, 3_600_000, DAY / 2, DAY - 1]) {
      const ms = msUntilUtcMidnight(10 * DAY + offset);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(DAY);
    }
  });
});

describe('formatCountdown', () => {
  it('formats H:MM:SS with zero-padded minutes and seconds', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(1_000)).toBe('00:00:01');
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
    expect(formatCountdown(DAY - 1_000)).toBe('23:59:59');
  });

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-5_000)).toBe('00:00:00');
  });
});
