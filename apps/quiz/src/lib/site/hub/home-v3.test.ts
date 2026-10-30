import { afterEach, describe, expect, it, vi } from 'vitest';

// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the three small modules the new home adds. The done marks of Today
// (the fan's plays of today on the quizzes of the day), the image slots (site_assets, empty until step 2 creates the table) and the Burrow
// switch (the registry feature dailyGuess and the pages of the hub).

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

import { REGISTRY } from '@/lib/site/registry';

import { burrowOpen, dailyGuessOn } from './daily-guess';
import { HOME_ASSET_KEYS, loadHomeAssets } from './home-assets';
import { doneOf, loadHomeDone, NOTHING_DONE } from './home-done';

import type { HomeToday } from './home-types';
import type { LiveAsset } from '@/lib/photos/public-read';

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

  // Step 2 replaced the empty reader by the read of site_assets_public (022), as this file's header said it would: the test of "reads
  // nothing meanwhile" became the test of the fail-closed read and of the mapping.
  it('has no image while site_assets_public is absent, empty or failing (fail closed)', async () => {
    expect(await loadHomeAssets(async () => [])).toEqual({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadHomeAssets(async () => { throw new Error('relation "public.site_assets_public" does not exist'); })).toEqual({});
  });

  it('gives each slot of the board the file of its size at its focal point, and nothing else', async () => {
    const live = (key: string, type: LiveAsset['type'] = 'card_image'): LiveAsset => ({
      key, type, page: 'home', settings: { focal: { x: 30, y: 70 } }, large: `https://s/${key}-1920.webp`, mid: `https://s/${key}-400.webp`,
      thumb: `https://s/${key}-96.webp`, width: 1920, height: 1280, sourceUrl: 'https://commons.wikimedia.org/x', author: 'A', license: 'cc_by',
      licenseNote: null, publishedAt: '2026-10-30T00:00:00Z',
    });
    const assets = await loadHomeAssets(async () => [
      live('home:site-k'), live('home:cross-2'), live('home:qotd-a'), live('banner:kpopdle', 'banner'), live('home:debate', 'icon'),
    ]);
    expect(assets).toEqual({
      siteK: { src: 'https://s/home:site-k-1920.webp', position: '30% 70%' },
      cross2: { src: 'https://s/home:cross-2-400.webp', position: '30% 70%' },
      qotdA: { src: 'https://s/home:qotd-a-96.webp', position: '30% 70%' },
    });
  });
});

describe('the Burrow', () => {
  // The owner's switch is the registry feature `dailyGuess` of the hub (daily games step 1), not an environment variable.
  const withKey = (on: boolean) => ({ ...REGISTRY.hub.features, dailyGuess: on }) as typeof REGISTRY.hub.features;

  it('is off by default: the registry feature dailyGuess, a missing key reading as false', () => {
    expect(dailyGuessOn()).toBe(false);
    // the hub's registry entry: no key yet (step 1 adds it as false)
    expect((REGISTRY.hub.features as unknown as Record<string, unknown>).dailyGuess ?? false).toBe(false);
    expect(dailyGuessOn(REGISTRY.hub.features)).toBe(false);
    expect(dailyGuessOn(withKey(false))).toBe(false);
    expect(dailyGuessOn(withKey(true))).toBe(true);
    // a truthy value that is not true is not the switch
    expect(dailyGuessOn({ ...REGISTRY.hub.features, dailyGuess: 1 } as unknown as typeof REGISTRY.hub.features)).toBe(false);
  });

  it('ignores the old DAILY_GUESS environment variable', () => {
    vi.stubEnv('DAILY_GUESS', '1');
    expect(dailyGuessOn()).toBe(false);
    expect(burrowOpen()).toBe(false);
  });

  it('stays closed with the feature on while the hub has no /daily, /kpopdle and /otakudle', () => {
    expect(burrowOpen()).toBe(false);
    expect(burrowOpen(withKey(false))).toBe(false);
    expect(burrowOpen(withKey(true))).toBe(false);
  });
});
