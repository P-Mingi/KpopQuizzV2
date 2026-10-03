// V12 F5b: the v12 readers of the fandom war (hub war rank and the profile war line
// through getGroupWarRank, the P8 rail through getFandomWarMap) leave editorial plays
// out with the flag on, and call today's RPC with the flag off.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const log = vi.hoisted(() => [] as string[]);
const war = (slug: string, week: number) => ({ name: slug.toUpperCase(), slug, logo_url: null, display_color: '#000', plays_week: week, fans_week: 1, plays_prev: 0 });
const ROWS: Record<string, unknown[]> = {
  editorial_accounts: [{ user_id: '11111111-1111-4111-8111-111111111111', display_name: 'Team', beat: 'news', active: true }],
  // today: the team's plays put ATEEZ first; without them BTS leads
  'rpc:get_fandom_war_map': [war('ateez', 50), war('bts', 40)],
  'rpc:get_fandom_war_map_v12': [war('bts', 40), war('ateez', 10)],
  groups: [],
};
function chain(key: string): unknown {
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve({ data: ROWS[key] ?? [], error: null, status: 200 }).then(res);
      return () => proxy;
    },
  });
  return proxy;
}
const client = {
  from: (t: string) => { log.push(t); return chain(t); },
  rpc: (fn: string) => { log.push(`rpc:${fn}`); return chain(`rpc:${fn}`); },
};
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client }));

async function flags(v12: boolean): Promise<void> {
  vi.resetModules();
  log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
}
afterEach(() => { vi.unstubAllEnvs(); });

describe('fandom war readers', () => {
  it('flag off: today RPC, ATEEZ #1, no team read', async () => {
    await flags(false);
    const { getGroupWarRank } = await import('@/lib/db/queries/group-hub');
    expect(await getGroupWarRank('ateez')).toEqual({ rank: 1, delta: null });
    expect(log).toContain('rpc:get_fandom_war_map');
    expect(log).not.toContain('editorial_accounts');
    expect(log).not.toContain('rpc:get_fandom_war_map_v12');
  });

  it('flag on: the v12 RPC, BTS #1, ATEEZ #2 (hub rank, profile war line, rail)', async () => {
    await flags(true);
    const { getGroupWarRank } = await import('@/lib/db/queries/group-hub');
    const { getFandomWarMap } = await import('@/lib/db/queries/community');
    expect(await getGroupWarRank('ateez')).toEqual({ rank: 2, delta: null });
    expect((await getFandomWarMap(30)).map((w) => w.slug)).toEqual(['bts', 'ateez']);
    expect(log).toContain('rpc:get_fandom_war_map_v12');
    expect(log).not.toContain('rpc:get_fandom_war_map');
  });
});
