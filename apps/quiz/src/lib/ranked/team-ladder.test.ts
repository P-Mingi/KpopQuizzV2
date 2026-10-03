// V12 F5b: editorial (team) accounts are left out of the ranked ladder, flag on only.
// With NEXT_PUBLIC_UX_V12 unset ladderView makes today's single read (limit 8) and no
// team read at all.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ladderView } from './service';
import { LADDER_LIMIT, ladderRowsWithoutTeam, ladderViewFrom } from './view';

import type { RankedStore } from './service';
import type { Season } from './season';
import type { LadderDbRow, LadderScope } from './view';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
const reads = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => { reads.push('service'); throw new Error('no db in tests'); },
  createPublicReadClient: () => { reads.push('public'); throw new Error('no db in tests'); },
}));

function row(pos: number, username: string, me = false, total = 40): LadderDbRow {
  return {
    position: pos, scope_position: pos, scope_total: total, season_score: 2000 - pos * 10, avg_answer_ms: 1200,
    runs_total: 9, is_me: me, legend: false, username, display_name: null, avatar_url: null, name_accent: null, name_font: null, bias: null,
  };
}
const LADDER = Array.from({ length: 12 }, (_, i) => row(i + 1, `fan${i + 1}`));
LADDER[1] = row(2, 'kpophistory');
LADDER[4] = row(5, 'soojinnie');
const ME = row(30, 'me', true);

function store(calls: Array<{ scope: LadderScope; limit: number }>): RankedStore {
  return {
    ladder: async (_s: number, scope: LadderScope, _u: string | null, limit: number) => {
      calls.push({ scope, limit });
      return [...LADDER.slice(0, limit), ME];
    },
    mainFandom: async () => 'stay',
  } as unknown as RankedStore;
}
const SEASON = { id: 3 } as Season;

afterEach(() => { vi.unstubAllEnvs(); reads.length = 0; });

describe('ladderRowsWithoutTeam', () => {
  it('no team: the rows as they are', () => {
    expect(ladderRowsWithoutTeam(LADDER, new Set())).toEqual(LADDER);
  });

  it('drops team rows and renumbers positions and the total', () => {
    const out = ladderRowsWithoutTeam([...LADDER.slice(0, 10), ME], new Set(['kpophistory', 'soojinnie', 'exoplanet99']));
    expect(out.map((r) => r.username)).toEqual(['fan1', 'fan3', 'fan4', 'fan6', 'fan7', 'fan8', 'fan9', 'fan10', 'me']);
    expect(out.map((r) => r.scope_position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 28]);
    expect(out.every((r) => r.scope_total === 38)).toBe(true);
  });
});

describe('ladderView', () => {
  it('flag off: one read of LADDER_LIMIT rows, no team read, today view', async () => {
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '');
    const calls: Array<{ scope: LadderScope; limit: number }> = [];
    const v = await ladderView(store(calls), SEASON, 'global', 'u1');
    expect(calls).toEqual([{ scope: 'global', limit: LADDER_LIMIT }]);
    expect(reads).toEqual([]);
    expect(v).toEqual(ladderViewFrom(3, 'global', [...LADDER.slice(0, LADDER_LIMIT), ME], LADDER_LIMIT));
    expect(v.rows.map((e) => e.username)).toContain('kpophistory');
  });

  it('team accounts: read limit + team size, none of them on the ladder, still 8 rows', async () => {
    const calls: Array<{ scope: LadderScope; limit: number }> = [];
    const team = new Set(['kpophistory', 'soojinnie', 'caratland']);
    const v = await ladderView(store(calls), SEASON, 'global', 'u1', LADDER_LIMIT, async () => team);
    expect(calls).toEqual([{ scope: 'global', limit: LADDER_LIMIT + 3 }]);
    expect(v.rows).toHaveLength(LADDER_LIMIT);
    expect(v.rows.some((e) => e.username !== null && team.has(e.username))).toBe(false);
    expect(v.rows.map((e) => e.scopePosition)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(v.me?.scopePosition).toBe(28);
    expect(v.total).toBe(38);
  });
});
