// Run O1, lot (c) part 2 (B3): create-profile. kpop keeps today's profiles insert; another site calls
// create_profile_for_site.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  site: 'kpop',
  user: { id: 'u1' } as { id: string } | null,
  ops: [] as Array<{ op: string; table?: string; fn?: string; arg?: unknown }>,
  rpcError: null as { message: string } | null,
  insertError: null as { message: string } | null,
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from(table: string) {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq']) q[m] = () => q;
      q.maybeSingle = async () => ({ data: null });
      q.insert = async (arg: unknown) => { state.ops.push({ op: 'insert', table, arg }); return { error: state.insertError }; };
      return q;
    },
    rpc: async (fn: string, arg: unknown) => { state.ops.push({ op: 'rpc', fn, arg }); return { data: 'u1', error: state.rpcError }; },
  }),
}));

import { POST } from './route';

const post = (body: unknown) => POST(new NextRequest('https://kpopquiz.org/api/auth/create-profile', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => Object.assign(state, { site: 'kpop', user: { id: 'u1' }, ops: [], rpcError: null, insertError: null }));

describe('POST /api/auth/create-profile', () => {
  it('kpop: the profiles insert of today, no rpc', async () => {
    const res = await post({ username: 'fan_one', via: 'k.menu' });
    expect(await res.json()).toEqual({ success: true, username: 'fan_one' });
    expect(state.ops).toHaveLength(1);
    expect(state.ops[0]).toMatchObject({ op: 'insert', table: 'profiles', arg: { id: 'u1', username: 'fan_one' } });
    expect(Object.keys(state.ops[0]!.arg as object)).toEqual(['id', 'username', 'avatar_bg', 'avatar_text']);
  });

  it('anime: create_profile_for_site with the site, joined by signup, and a valid via', async () => {
    state.site = 'anime';
    const res = await post({ username: 'fan_one', via: 'k.menu' });
    expect(await res.json()).toEqual({ success: true, username: 'fan_one' });
    expect(state.ops).toHaveLength(1);
    expect(state.ops[0]).toMatchObject({
      op: 'rpc', fn: 'create_profile_for_site',
      arg: { p_username: 'fan_one', p_site: 'anime', p_via: 'signup', p_via_code: 'k.menu' },
    });
    expect(state.ops[0]!.arg).toMatchObject({ p_avatar_bg: expect.any(String), p_avatar_text: expect.any(String) });
  });

  it('anime: a missing or malformed via becomes null', async () => {
    state.site = 'anime';
    for (const via of [undefined, 'nope', 'K.MENU', 3, 'k.m']) {
      state.ops = [];
      await post({ username: 'fan_one', via });
      expect(state.ops[0]!.arg).toMatchObject({ p_via_code: null });
    }
  });

  it('anime: a database error is 500 Failed to create profile', async () => {
    state.site = 'anime';
    state.rpcError = { message: 'x' };
    const res = await post({ username: 'fan_one' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create profile' });
  });

  it('the checks of today still run on every site', async () => {
    for (const site of ['kpop', 'anime']) {
      state.site = site;
      state.ops = [];
      expect((await post({ username: 'AB' })).status).toBe(400);
      expect((await post({ username: 'admin' })).status).toBe(400);
      expect(state.ops).toEqual([]);
    }
    state.user = null;
    expect((await post({ username: 'fan_one' })).status).toBe(401);
  });
});
