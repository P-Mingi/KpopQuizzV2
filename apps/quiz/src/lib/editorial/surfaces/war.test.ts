// V12 F5b: the fandom war leaves editorial accounts out, flag on only. Supabase is a
// recording fake: each test proves which tables and functions a read touches. With
// NEXT_PUBLIC_UX_V12 unset the call is today's get_fandom_war_map and editorial_accounts
// is never read.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const reads: string[] = [];
const fake = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, missing: new Set<string>() }));
function result(key: string): { data: unknown[] | null; error: { code: string; message: string } | null; status: number } {
  if (fake.missing.has(key)) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' }, status: 404 };
  return { data: fake.rows[key] ?? [], error: null, status: 200 };
}
function chain(key: string): unknown {
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result(key)).then(res);
      return () => proxy;
    },
  });
  return proxy;
}
const client = {
  from: (t: string) => { reads.push(t); return chain(t); },
  rpc: (fn: string, args: unknown) => { reads.push(`rpc:${fn}:${JSON.stringify(args)}`); return chain(`rpc:${fn}`); },
};
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));

const TEAM = '11111111-1111-4111-8111-111111111111';
const warRow = (slug: string, week: number) => ({ name: slug.toUpperCase(), slug, logo_url: null, display_color: '#000', plays_week: week, fans_week: 1, plays_prev: 0 });

async function flags(v12: boolean, team = true): Promise<void> {
  vi.resetModules();
  reads.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.missing = new Set();
  fake.rows = {
    editorial_accounts: team ? [{ user_id: TEAM, display_name: 'Team', beat: 'news', active: true }] : [],
    // today's map counts the team's plays (ateez first); the v12 one does not
    'rpc:get_fandom_war_map': [warRow('ateez', 50), warRow('bts', 40), warRow('general-kpop', 30)],
    'rpc:get_fandom_war_map_v12': [warRow('bts', 40), warRow('ateez', 10)],
    groups: [],
  };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('rpcFandomWar', () => {
  it('flag off: today call exactly, no team read', async () => {
    await flags(false);
    const { rpcFandomWar, warCacheKey } = await import('./war');
    const res = await rpcFandomWar(client, 31);
    expect(reads).toEqual(['rpc:get_fandom_war_map:{"p_limit":31}']);
    expect((res.data as Array<{ slug: string }>).map((r) => r.slug)).toEqual(['ateez', 'bts', 'general-kpop']);
    expect(warCacheKey(['k:v1'])).toEqual(['k:v1']);
  });

  it('flag on with team accounts: the v12 function, team plays gone', async () => {
    await flags(true);
    const { rpcFandomWar, warCacheKey } = await import('./war');
    const res = await rpcFandomWar(client, 31);
    expect(reads).toEqual(['editorial_accounts', 'rpc:get_fandom_war_map_v12:{"p_limit":31}']);
    expect((res.data as Array<{ slug: string }>).map((r) => r.slug)).toEqual(['bts', 'ateez']);
    expect(warCacheKey(['k:v1'])).toEqual(['k:v1', 'v12-no-team']);
  });

  it('flag on, v12 SQL not applied: falls back to today call', async () => {
    await flags(true);
    fake.missing.add('rpc:get_fandom_war_map_v12');
    const { rpcFandomWar } = await import('./war');
    const res = await rpcFandomWar(client, 5);
    expect(reads).toEqual(['editorial_accounts', 'rpc:get_fandom_war_map_v12:{"p_limit":5}', 'rpc:get_fandom_war_map:{"p_limit":5}']);
    expect(res.error).toBeNull();
  });

  it('flag on, nobody editorial: today call', async () => {
    await flags(true, false);
    const { rpcFandomWar } = await import('./war');
    await rpcFandomWar(client, 5);
    expect(reads).toEqual(['editorial_accounts', 'rpc:get_fandom_war_map:{"p_limit":5}']);
  });
});
