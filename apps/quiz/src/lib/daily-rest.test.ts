import { describe, expect, it } from 'vitest';

import { addDays, advanceStreak, localDate, restAvailable, streakAlive } from './daily-rest';

describe('advanceStreak: the free rest day (audit 01 P1-6)', () => {
  it('a one-day gap is covered by the rest day, which does not count as a played day', () => {
    const s = advanceStreak({ last: '2026-11-05', count: 4 }, '2026-11-07');
    expect(s).toMatchObject({ count: 5, last: '2026-11-07', rest: '2026-11-06', usedRest: true });
  });
  it('only one rest day per 7 days', () => {
    const a = advanceStreak({ last: '2026-11-05', count: 4 }, '2026-11-07');
    const b = advanceStreak(a, '2026-11-09'); // another gap two days after: no rest left
    expect(b.count).toBe(1);
    const c = advanceStreak({ last: '2026-11-12', count: 8, rest: a.rest }, '2026-11-14'); // 8 days after the rest day: free again
    expect(c).toMatchObject({ count: 9, usedRest: true });
  });
  it('a gap of two missed days resets, a normal next day adds one, the same day changes nothing', () => {
    expect(advanceStreak({ last: '2026-11-05', count: 4 }, '2026-11-08').count).toBe(1);
    expect(advanceStreak({ last: '2026-11-05', count: 4 }, '2026-11-06').count).toBe(5);
    expect(advanceStreak({ last: '2026-11-05', count: 4 }, '2026-11-05')).toMatchObject({ count: 4, usedRest: false });
  });
  it('the first play is day 1', () => {
    expect(advanceStreak(null, '2026-11-05').count).toBe(1);
  });
  it('restAvailable and streakAlive agree', () => {
    expect(restAvailable('2026-11-03', '2026-11-09')).toBe(false);
    expect(restAvailable('2026-11-02', '2026-11-09')).toBe(true);
    expect(streakAlive({ last: '2026-11-07', count: 3 }, '2026-11-09')).toBe(true);
    expect(streakAlive({ last: '2026-11-06', count: 3 }, '2026-11-09')).toBe(false);
  });
});

describe('local day (audit 01 P2-11)', () => {
  it('two 6 pm plays on consecutive local days keep the streak, whatever UTC says', () => {
    // 6 pm on the browser's own clock: 18:00 local is 02:00 UTC the next day in Los Angeles, still two consecutive local dates.
    const d1 = localDate(new Date(2026, 10, 9, 18, 0));
    const d2 = localDate(new Date(2026, 10, 10, 18, 0));
    expect([d1, d2]).toEqual(['2026-11-09', '2026-11-10']);
    expect(advanceStreak({ last: d1, count: 1 }, d2).count).toBe(2);
  });
  it('addDays crosses a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});
