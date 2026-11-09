import { describe, expect, it, vi } from 'vitest';

import { readCommonPassport } from './passport-page';

import type { buildCommonPassport as BuildFn } from './passport-page';

// The jump links are minted by the hub build (letter f).
async function buildCommonPassport(...a: Parameters<typeof BuildFn>): Promise<ReturnType<typeof BuildFn>> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
  return (await import('./passport-page')).buildCommonPassport(...a);
}

import type { MyPassportRow } from '@/lib/passport/types';

const row = (site_id: string, xp: number, extra: Partial<MyPassportRow> = {}): MyPassportRow => ({
  site_id: site_id as MyPassportRow['site_id'], joined_at: '2026-01-01', joined_via: 'direct' as MyPassportRow['joined_via'], via_code: null,
  activated_at: '2026-01-01', xp, plays: 4, daily_streak: 2, quizzes_created: 0, show_elsewhere: true, ...extra,
});

describe('buildCommonPassport', () => {
  it('lists the XP and the level of both sites, in network order, and the total of the two', async () => {
    const p = await buildCommonPassport([row('anime', 300), row('kpop', 1200)], 'mina');
    expect(p.sites.map((s) => [s.id, s.xp])).toEqual([['kpop', 1200], ['anime', 300]]);
    expect(p.sites.every((s) => s.level >= 1)).toBe(true);
    expect(p.totalXp).toBe(1500);
    expect(p.username).toBe('mina');
    expect(p.sites[1]!.href).toBe('/auth/passport/out?to=anime&next=%2Fme&via=f.pp');
  });
  it('leaves out a site the fan did not activate', async () => {
    expect((await buildCommonPassport([row('kpop', 10), row('anime', 5, { activated_at: null })], null)).sites.map((s) => s.id)).toEqual(['kpop']);
  });
  it('clamps junk numbers to zero', async () => {
    expect((await buildCommonPassport([row('kpop', -5)], null)).totalXp).toBe(0);
  });
});

describe('readCommonPassport', () => {
  const client = (user: { id: string } | null, rows: MyPassportRow[] | null) => ({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: async () => (rows ? { data: rows, error: null } : { data: null, error: { message: 'x' } }),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { username: 'mina' }, error: null }) }) }) }),
  }) as never;
  it('signed out: null', async () => { expect(await readCommonPassport(client(null, []))).toBeNull(); });
  it('a read error: null', async () => { expect(await readCommonPassport(client({ id: 'u' }, null))).toBeNull(); });
  it('no stamp: null', async () => { expect(await readCommonPassport(client({ id: 'u' }, []))).toBeNull(); });
  it('signed in: both sites', async () => {
    const p = await readCommonPassport(client({ id: 'u' }, [row('kpop', 100), row('anime', 50)]));
    expect(p?.totalXp).toBe(150);
    expect(p?.username).toBe('mina');
  });
});
