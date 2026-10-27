// Run O1, lot (c) part 2 (B3): the blind-test play route's XP goes through awardXpForSite.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ site: 'kpop', rpc: [] as Array<{ client: string; fn: string; args: Record<string, unknown> }> }));

const GAME = {
  id: 'game-1', game_type: 'blind_test', play_count: 3, creator_id: 'creator-1', group_id: 1,
  content: {
    settings: { clip_duration: 10 },
    songs: [
      { id: 's1', correct_index: 1, times_played: 0, times_correct: 0, avg_answer_time: 0 },
      { id: 's2', correct_index: 0, times_played: 0, times_correct: 0, avg_answer_time: 0 },
    ],
  },
};

function db(client: string) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'player-1' } } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpc.push({ client, fn, args });
      return { data: 5, error: null };
    },
    from(table: string) {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'update', 'insert']) q[m] = () => q;
      q.single = async () => ({ data: GAME, error: null });
      q.maybeSingle = async () => ({ data: null, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: null, table });
      return q;
    },
  };
}

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => db('user'), createServiceRoleClient: () => db('admin') }));

import { POST } from './route';

const play = () =>
  POST(
    new NextRequest('https://kpopquiz.org/api/game/game-1/play', {
      method: 'POST', body: JSON.stringify({ choices: { s1: { picked: 1, time: 3 }, s2: { picked: 0, time: 4 } } }),
    }),
    { params: Promise.resolve({ id: 'game-1' }) },
  );

beforeEach(() => Object.assign(state, { site: 'kpop', rpc: [] }));

describe('POST /api/game/[id]/play XP per site', () => {
  it('kpop: award_xp with today\'s arguments for the player and the creator, no ensure_membership', async () => {
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.rpc).toEqual([
      { client: 'admin', fn: 'award_xp', args: { p_user_id: 'player-1', p_amount: 10, p_reason: 'game_play' } },
      { client: 'admin', fn: 'award_xp', args: { p_user_id: 'creator-1', p_amount: 1, p_reason: 'play_received' } },
    ]);
  });

  it('anime: ensure_membership, then award_world_xp for both', async () => {
    state.site = 'anime';
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.rpc).toEqual([
      { client: 'user', fn: 'ensure_membership', args: { p_site: 'anime', p_via: 'play', p_via_code: null } },
      { client: 'admin', fn: 'award_world_xp', args: { p_user: 'player-1', p_site: 'anime', p_amount: 10, p_reason: 'game_play' } },
      { client: 'admin', fn: 'award_world_xp', args: { p_user: 'creator-1', p_site: 'anime', p_amount: 1, p_reason: 'play_received' } },
    ]);
  });
});
