// Run O1, lot (b), lane P1: the header of a world site is the membership's. headerUser reads world_memberships.header_url on
// anime and profiles.header_url on kpop; the save goes through update_my_membership (the stamp first) on anime.
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ calls: [] as Array<{ fn: string; args: Record<string, unknown> }>, selects: [] as string[] }));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => ({
      select: (cols: string) => {
        state.selects.push(`${table}:${cols}`);
        const b = { eq: () => b, maybeSingle: async () => ({ data: table === 'profiles' ? (cols.includes('header_url') ? { username: 'mina', header_url: 'https://kpop/h.png' } : { username: 'mina' }) : { header_url: 'https://anime/h.png' } }) };
        return b;
      },
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => { state.calls.push({ fn, args }); return { error: null }; },
  }),
  createServiceRoleClient: () => ({}),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

async function load(site: 'anime' | 'kpop') {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  state.calls = [];
  state.selects = [];
  return import('./header-store');
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('headerUser', () => {
  it('kpop: the header of the profile, one profiles read, as today', async () => {
    const { headerUser } = await load('kpop');
    const who = await headerUser();
    expect(who?.user).toEqual({ id: 'u1', username: 'mina', headerUrl: 'https://kpop/h.png' });
    expect(state.selects).toEqual(['profiles:username, header_url']);
  });
  it('anime: the header of the membership of this site, never the profile\'s', async () => {
    const { headerUser } = await load('anime');
    const who = await headerUser();
    expect(who?.user).toEqual({ id: 'u1', username: 'mina', headerUrl: 'https://anime/h.png' });
    expect(state.selects).toEqual(['profiles:username', 'world_memberships:header_url']);
  });
});

describe('saveWorldHeader', () => {
  it('makes the stamp, then patches header_url of this site', async () => {
    const { saveWorldHeader } = await load('anime');
    const { createServerClient } = await import('@/lib/supabase/server');
    const res = await saveWorldHeader((await createServerClient()) as never, 'https://img/x.webp');
    expect(res.error).toBeNull();
    expect(state.calls).toEqual([
      { fn: 'ensure_membership', args: { p_site: 'anime', p_via: 'signup', p_via_code: null } },
      { fn: 'update_my_membership', args: { p_site: 'anime', p_patch: { header_url: 'https://img/x.webp' } } },
    ]);
  });
});
