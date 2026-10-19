// Run O1, lot (c) part 2 (B3): the play route's XP goes through awardXpForSite. On kpop the rpc calls are today's
// (award_xp, same arguments, and no ensure_membership); on anime they are award_world_xp and the user's stamp, and
// the level name comes from the anime ladder.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  site: 'kpop',
  rpc: [] as Array<{ client: string; fn: string; args: Record<string, unknown> }>,
  newXp: 3040,
}));

function db(client: string) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'player-1' } } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpc.push({ client, fn, args });
      if (fn === 'record_play') return { data: [{ play_id: 'play-1', percentile: 80 }], error: null };
      if (fn === 'award_xp' || fn === 'award_world_xp') return { data: args.p_reason === 'play' ? state.newXp : 1, error: null };
      return { data: null, error: null };
    },
    from() {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'gte', 'is', 'limit', 'update', 'upsert']) q[m] = () => q;
      q.single = async () => ({ data: { difficulty: 'easy', creator_id: 'creator-1', play_count: 12, title: 'Quiz' } });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: [], error: null, count: 10 });
      return q;
    },
  };
}

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => false }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => db('user'), createServiceRoleClient: () => db('admin') }));
vi.mock('@/lib/notifications', () => ({ notifyMilestone: async () => {} }));
vi.mock('@/lib/badges/award', () => ({ checkTierBadges: async () => [] }));
vi.mock('@/lib/quiz/time-stats', () => ({ timeSample: () => null, recordTimeSample: async () => {} }));

import { POST } from './route';

const play = (score = 10) =>
  POST(
    new NextRequest('https://kpopquiz.org/api/quiz/quiz-1/play', { method: 'POST', body: JSON.stringify({ score, total_questions: 10 }) }),
    { params: Promise.resolve({ id: 'quiz-1' }) },
  );
const xp = () => state.rpc.filter((c) => c.fn === 'award_xp' || c.fn === 'award_world_xp');

beforeEach(() => Object.assign(state, { site: 'kpop', rpc: [], newXp: 3040 }));

describe('POST /api/quiz/[id]/play XP per site', () => {
  it('kpop: award_xp on the service role client with today\'s arguments, no ensure_membership', async () => {
    const res = await play(10);
    const body = await res.json();
    expect(xp()).toEqual([
      { client: 'admin', fn: 'award_xp', args: { p_user_id: 'player-1', p_amount: 30, p_reason: 'play' } },
      { client: 'admin', fn: 'award_xp', args: { p_user_id: 'creator-1', p_amount: 1, p_reason: 'play_received' } },
    ]);
    expect(Object.keys(xp()[0]!.args)).toEqual(['p_user_id', 'p_amount', 'p_reason']);
    expect(state.rpc.some((c) => c.fn === 'ensure_membership')).toBe(false);
    expect(body).toMatchObject({ xp_earned: 30, new_xp: 3040, leveled_up: true, new_level: 10, new_level_name: 'Bias' });
  });

  it('anime: ensure_membership for the player first, then award_world_xp, and the anime level name', async () => {
    state.site = 'anime';
    const res = await play(10);
    const body = await res.json();
    expect(xp()).toEqual([
      { client: 'admin', fn: 'award_world_xp', args: { p_user: 'player-1', p_site: 'anime', p_amount: 30, p_reason: 'play' } },
      { client: 'admin', fn: 'award_world_xp', args: { p_user: 'creator-1', p_site: 'anime', p_amount: 1, p_reason: 'play_received' } },
    ]);
    const order = state.rpc.map((c) => c.fn);
    expect(order.indexOf('ensure_membership')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('ensure_membership')).toBeLessThan(order.indexOf('record_play'));
    expect(state.rpc.find((c) => c.fn === 'ensure_membership')).toEqual({
      client: 'user', fn: 'ensure_membership', args: { p_site: 'anime', p_via: 'play', p_via_code: null },
    });
    expect(body).toMatchObject({ xp_earned: 30, new_xp: 3040, leveled_up: true, new_level: 10, new_level_name: 'Otaku' });
    expect(state.rpc.some((c) => c.fn === 'award_xp')).toBe(false);
  });
});
