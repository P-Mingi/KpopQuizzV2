// F3 for G8, issue C2-002: the hub "Play live" tile only while the live mode is
// open. getHubGrowth takes `live` from isLiveOpen (lib/live/server: the GET
// /api/live probe, fail closed, no read with the flag off) instead of `true`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const live = vi.hoisted(() => ({ open: false, calls: 0 }));

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/live/server', () => ({ isLiveOpen: async () => { live.calls += 1; return live.open; } }));
vi.mock('@/lib/editorial/accounts', () => ({ getTeamIds: async () => new Set<string>() }));
vi.mock('@/lib/duel/server', () => ({ getFansPicked: async () => null }));
vi.mock('@/lib/name-all/server', () => ({ getNameAllSet: async () => null, getNameAllStats: async () => null }));
vi.mock('@/lib/personality/data', () => ({ getWmaGroupSlugs: async () => [], getMemberCounts: async () => null }));
vi.mock('@/lib/supabase/server', () => {
  const no = (): never => { throw new Error('no database client in this test'); };
  return { createPublicReadClient: no, createServiceRoleClient: no };
});

const { getHubGrowth } = await import('./growth-data');
const { waysToPlay } = await import('./growth');

// An established hub (4 quizzes) with a blindtest: Quizzes, Blindtest, and Play live while open.
const G = { id: 1, slug: 'katseye', name: 'KATSEYE' };

beforeEach(() => { live.open = false; live.calls = 0; });

describe('C2-002: the Play live tile follows the live mode', () => {
  it('closed: no live flag, no Play live tile, no "live with friends" foot', async () => {
    const d = await getHubGrowth(G, 40, 25);
    expect(live.calls).toBe(1);
    expect(d.ways.live).toBe(false);
    const tiles = waysToPlay(d.ways);
    expect(tiles.map((t) => t.key)).not.toContain('live');
    expect(tiles.some((t) => (t.href ?? '').startsWith('/live'))).toBe(false);
    expect(tiles.find((t) => t.key === 'blindtest')?.foot ?? null).toBeNull();
  });

  it('open: the tile is offered', async () => {
    live.open = true;
    const d = await getHubGrowth(G, 40, 25);
    expect(d.ways.live).toBe(true);
    expect(waysToPlay(d.ways).map((t) => t.key)).toContain('live');
  });
});
