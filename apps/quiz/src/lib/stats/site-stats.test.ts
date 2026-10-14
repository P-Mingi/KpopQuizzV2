import { describe, expect, it } from 'vitest';

import { atLeast, exact } from './site-stats';

// The shared rounding of every public count (owner, 2026-10-14): a floor, so "N+" is
// always true, and one format everywhere.

describe('atLeast', () => {
  it('exact under 100, then floors to the ten, the hundred, the thousand', () => {
    expect(atLeast(47)).toBe('47');
    expect(atLeast(456)).toBe('450+');
    expect(atLeast(4281)).toBe('4,200+');
    expect(atLeast(73425)).toBe('73,000+');
  });
  it('never claims more than the real number', () => {
    for (const n of [100, 999, 1000, 9999, 10000, 123456]) {
      const shown = Number(atLeast(n).replace(/[+,]/g, ''));
      expect(shown).toBeLessThanOrEqual(n);
    }
  });
  it('a broken input is 0, never NaN', () => {
    expect(atLeast(Number.NaN)).toBe('0');
    expect(atLeast(-3)).toBe('0');
    expect(exact(73425)).toBe('73,425');
  });
});
