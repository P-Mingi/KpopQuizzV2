// Run O1, lot (c) part 2 (B3): merge-anon passes p_site only off kpop; the kpop arguments are today's.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ site: 'kpop', rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>, user: { id: 'u1' } as { id: string } | null }));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => { state.rpc.push({ fn, args }); return { data: true, error: null }; },
  }),
}));

import { POST } from './route';

const body = { quizzes_played: 3, blindtests_played: 2, duels_voted: 1, battles_played: 4, group_stats: [{ group_id: 7, songs_played: 5, songs_correct: 3 }] };
const post = () => POST(new NextRequest('https://kpopquiz.org/api/passport/merge-anon', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => Object.assign(state, { site: 'kpop', rpc: [], user: { id: 'u1' } }));

describe('POST /api/passport/merge-anon', () => {
  it('kpop: today\'s six arguments, no p_site', async () => {
    const res = await post();
    expect(await res.json()).toEqual({ merged: true });
    expect(state.rpc).toEqual([{
      fn: 'merge_anon_passport',
      args: {
        p_user_id: 'u1', p_quizzes_played: 3, p_blindtests_played: 2, p_duels_voted: 1, p_battles_played: 4,
        p_group_stats: [{ group_id: 7, songs_played: 5, songs_correct: 3 }],
      },
    }]);
    expect(state.rpc[0]!.args).not.toHaveProperty('p_site');
    expect(Object.keys(state.rpc[0]!.args)).toEqual(['p_user_id', 'p_quizzes_played', 'p_blindtests_played', 'p_duels_voted', 'p_battles_played', 'p_group_stats']);
  });

  it('anime and hub add p_site', async () => {
    for (const site of ['anime', 'hub']) {
      state.site = site;
      state.rpc = [];
      await post();
      expect(state.rpc[0]!.args).toMatchObject({ p_user_id: 'u1', p_quizzes_played: 3, p_site: site });
    }
  });

  it('401 when signed out, before any rpc', async () => {
    state.user = null;
    expect((await post()).status).toBe(401);
    expect(state.rpc).toEqual([]);
  });
});
