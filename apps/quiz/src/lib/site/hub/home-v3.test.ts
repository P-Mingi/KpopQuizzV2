import { afterEach, describe, expect, it, vi } from 'vitest';

// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the three small modules the new home adds. The done marks of Today
// (the fan's plays of today on the quizzes of the day), the image slots (site_assets, empty until step 2 creates the table) and the Burrow
// switch (the dailyGuess flag and the pages of the hub).

const fake = vi.hoisted(() => ({ rows: [] as Array<{ quiz_id: string }>, error: null as null | { message: string }, asked: [] as Array<Record<string, unknown>>, reads: 0 }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    fake.reads += 1;
    return {
      from: (table: string) => {
        const asked: Record<string, unknown> = { table };
        fake.asked.push(asked);
        const q = {
          select: (c: string) => { asked.select = c; return q; },
          eq: (c: string, v: unknown) => { asked[`eq:${c}`] = v; return q; },
          in: (c: string, v: unknown) => { asked[`in:${c}`] = v; return q; },
          gte: (c: string, v: unknown) => { asked[`gte:${c}`] = v; return q; },
          limit: () => Promise.resolve({ data: fake.error ? null : fake.rows, error: fake.error }),
        };
        return q;
      },
    };
  },
}));

import { burrowOpen, dailyGuessOn } from './daily-guess';
import { HOME_ASSET_KEYS, loadHomeAssets } from './home-assets';
import { doneOf, loadHomeDone, NOTHING_DONE } from './home-done';

import type { HomeToday } from './home-types';

const today = (): HomeToday => ({
  quizzes: [
    { site: 'kpop', id: 'k1', title: 'K', questions: 10, meta: '', path: '/q/k?daily=quiz' },
    { site: 'anime', id: 'a1', title: 'A', questions: 10, meta: '', path: '/q/a?daily=quiz' },
  ],
  blindtest: null,
  debate: null,
  rotation: { nextAt: '2026-10-30T00:05:00.000Z', parisTime: '1:05' },
});

afterEach(() => {
  fake.rows = [];
  fake.error = null;
  fake.asked = [];
  fake.reads = 0;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the quizzes of the day done today', () => {
  it('marks a site done when the fan played its quiz of the day today', () => {
    expect(doneOf(today(), new Set(['k1']))).toEqual({ kpop: true, anime: false });
    expect(doneOf(today(), new Set(['a1', 'k1']))).toEqual({ kpop: true, anime: true });
    expect(doneOf(today(), new Set(['another-quiz']))).toEqual(NOTHING_DONE);
  });

  it('reads the fan\'s plays of today on the quizzes of the day only', async () => {
    fake.rows = [{ quiz_id: 'a1' }];
    const done = await loadHomeDone('u-1', today(), new Date('2026-10-29T15:00:00Z'));
    expect(done).toEqual({ kpop: false, anime: true });
    expect(fake.asked).toEqual([{ table: 'plays', select: 'quiz_id', 'eq:player_id': 'u-1', 'in:quiz_id': ['k1', 'a1'], 'gte:created_at': '2026-10-29T00:00:00Z' }]);
  });

  it('reads nothing for a guest, with no quiz of the day, or with no Today; nothing is done on an error', async () => {
    expect(await loadHomeDone(null, today())).toEqual(NOTHING_DONE);
    expect(await loadHomeDone('u-1', null)).toEqual(NOTHING_DONE);
    expect(await loadHomeDone('u-1', { ...today(), quizzes: [] })).toEqual(NOTHING_DONE);
    expect(fake.reads).toBe(0);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.error = { message: 'boom' };
    expect(await loadHomeDone('u-1', today())).toEqual(NOTHING_DONE);
  });
});

describe('the image slots', () => {
  it('names the ten slots of the board', () => {
    expect(HOME_ASSET_KEYS).toEqual(['siteK', 'siteA', 'kpopdle', 'otakudle', 'qotdK', 'qotdA', 'debate', 'cross1', 'cross2', 'cross3']);
  });

  it('has no image until site_assets exists, and reads nothing meanwhile', async () => {
    expect(await loadHomeAssets()).toEqual({});
    expect(fake.reads).toBe(0);
  });
});

describe('the Burrow', () => {
  it('is off by default: dailyGuess is the server flag DAILY_GUESS, 1 or true', () => {
    expect(dailyGuessOn(undefined)).toBe(false);
    expect(dailyGuessOn('')).toBe(false);
    expect(dailyGuessOn('0')).toBe(false);
    expect(dailyGuessOn('1')).toBe(true);
    expect(dailyGuessOn('true')).toBe(true);
  });

  it('stays closed with the flag on while the hub has no /daily, /kpopdle and /otakudle', () => {
    expect(burrowOpen(undefined)).toBe(false);
    expect(burrowOpen('1')).toBe(false);
  });
});
