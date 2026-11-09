// Audit 01 P1-6: the played state and the score of the day survive a reload (localStorage), and reset at the next UTC day.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ analytics: { dailyComplete: vi.fn() } }));

import { dailyScoreToday, hasPlayedDaily, markDailyPlayed, markDailyScore } from './daily-played';
import { guestLiveStreak, recordGuestDaily } from './guest-streak';

function stubBrowser(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } } });
  vi.stubGlobal('localStorage', (window as unknown as { localStorage: Storage }).localStorage);
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 9, 18, 0)); stubBrowser(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('the played state of the day', () => {
  it('survives a reload (same storage) and carries the score', () => {
    expect(hasPlayedDaily('quiz')).toBe(false);
    markDailyPlayed('quiz');
    markDailyScore(8, 10);
    expect(hasPlayedDaily('quiz')).toBe(true);
    expect(dailyScoreToday()).toEqual({ score: 8, max: 10 });
  });
  it('is gone the next UTC day', () => {
    markDailyPlayed('quiz');
    markDailyScore(8, 10);
    vi.setSystemTime(new Date(Date.now() + 86_400_000));
    expect(hasPlayedDaily('quiz')).toBe(false);
    expect(dailyScoreToday()).toBeNull();
  });
});

describe('the guest streak by local day with the rest day', () => {
  it('two 6 pm plays on consecutive local days keep the streak; a one-day gap is covered', () => {
    recordGuestDaily(new Date(2026, 10, 9, 18, 0));
    expect(recordGuestDaily(new Date(2026, 10, 10, 18, 0))).toBe(2);
    expect(recordGuestDaily(new Date(2026, 10, 12, 18, 0))).toBe(3); // 11 Nov missed: the free rest day
    expect(recordGuestDaily(new Date(2026, 10, 14, 18, 0))).toBe(1); // another gap within 7 days: reset
  });
  it('guestLiveStreak shows a streak that is still alive', () => {
    recordGuestDaily(new Date(2026, 10, 8, 18, 0));
    recordGuestDaily(new Date(2026, 10, 9, 18, 0));
    expect(guestLiveStreak(new Date(2026, 10, 9, 19, 0))).toEqual({ count: 2, playedToday: true });
    expect(guestLiveStreak(new Date(2026, 10, 13, 9, 0)).count).toBe(0);
  });
});
