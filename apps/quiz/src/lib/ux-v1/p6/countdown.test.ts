import { describe, expect, it } from 'vitest';

import { countdown } from './countdown';

describe('countdown', () => {
  it('shows whole seconds like the old Math.ceil of the fraction', () => {
    expect(countdown(0, 10)).toEqual({ left: 10, done: false });
    expect(countdown(50, 10)).toEqual({ left: 10, done: false });
    expect(countdown(1000, 10)).toEqual({ left: 9, done: false });
    expect(countdown(1001, 10)).toEqual({ left: 9, done: false });
    expect(countdown(7000, 10)).toEqual({ left: 3, done: false });
    expect(countdown(9999, 10)).toEqual({ left: 1, done: false });
  });
  it('is done at the total and never negative', () => {
    expect(countdown(10000, 10)).toEqual({ left: 0, done: true });
    expect(countdown(25000, 10)).toEqual({ left: 0, done: true });
    expect(countdown(-5, 10)).toEqual({ left: 10, done: false });
  });
  it('changes value once per second, so a 250 ms poll renders four times less often than it reads', () => {
    const seen: number[] = [];
    for (let t = 0; t < 10000; t += 250) {
      const { left } = countdown(t, 10);
      if (seen[seen.length - 1] !== left) seen.push(left);
    }
    expect(seen).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});
