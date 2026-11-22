import { describe, expect, it } from 'vitest';

import { isoWeek, weekRange } from './home-week';

// Lot HUB-HOT-B: the eyebrow of "Popular this week": the ISO week in progress and its Monday to Sunday range, in UTC, with a plain hyphen.
describe('the week of the eyebrow', () => {
  it('numbers the ISO week (Monday first, week 1 holds the first Thursday)', () => {
    expect(isoWeek(new Date('2026-11-22T10:00:00Z'))).toBe(47); // a Sunday: still week 47
    expect(isoWeek(new Date('2026-11-23T00:00:00Z'))).toBe(48); // the Monday after
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe(53); // a Friday: it belongs to the last week of 2026
    expect(isoWeek(new Date('2024-12-30T12:00:00Z'))).toBe(1); // a Monday of December that is week 1 of 2025
  });

  it('writes the Monday to Sunday range with a hyphen, and both months when the week crosses two', () => {
    expect(weekRange(new Date('2026-11-18T10:00:00Z'))).toBe('16-22 Nov');
    expect(weekRange(new Date('2026-11-22T23:59:00Z'))).toBe('16-22 Nov');
    expect(weekRange(new Date('2026-11-23T00:00:00Z'))).toBe('23-29 Nov');
    expect(weekRange(new Date('2026-12-02T10:00:00Z'))).toBe('30 Nov-6 Dec');
    const text = weekRange(new Date('2026-12-02T10:00:00Z'));
    expect(text).not.toContain(String.fromCharCode(0x2013));
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });
});
