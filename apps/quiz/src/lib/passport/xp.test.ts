// Run O1, lot (c) part 2 (B3): awardXpForSite sends today's exact arguments on kpop and award_world_xp elsewhere.
import { describe, expect, it, vi } from 'vitest';

const created = vi.hoisted(() => ({ n: 0, calls: [] as Array<{ fn: string; args: unknown }> }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => {
    created.n += 1;
    return { rpc: async (fn: string, args: unknown) => { created.calls.push({ fn, args }); return { data: 42, error: null }; } };
  },
}));

import { awardXpForSite, xpRpcFor } from './xp';

import type { RpcClient } from './xp';

function client(data: unknown): RpcClient & { calls: Array<{ fn: string; args: unknown }> } {
  const calls: Array<{ fn: string; args: unknown }> = [];
  return { calls, rpc: async (fn, args) => { calls.push({ fn, args }); return { data }; } };
}

describe('awardXpForSite', () => {
  it('kpop calls award_xp with the three arguments of today, in the same key order', async () => {
    const c = client(1234);
    expect(await awardXpForSite('kpop', 'user-1', 15, 'play', c)).toBe(1234);
    expect(c.calls).toEqual([{ fn: 'award_xp', args: { p_user_id: 'user-1', p_amount: 15, p_reason: 'play' } }]);
    expect(Object.keys(c.calls[0]!.args as object)).toEqual(['p_user_id', 'p_amount', 'p_reason']);
  });

  it('anime and hub call award_world_xp with the site', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const c = client(150);
      expect(await awardXpForSite(site, 'user-2', 5, 'daily_streak', c)).toBe(150);
      expect(c.calls).toEqual([{ fn: 'award_world_xp', args: { p_user: 'user-2', p_site: site, p_amount: 5, p_reason: 'daily_streak' } }]);
    }
  });

  it('resolves to null when the rpc returns no number (an error, a null, a string)', async () => {
    for (const data of [null, undefined, '12', { xp: 1 }, []]) {
      expect(await awardXpForSite('kpop', 'u', 1, 'play', client(data))).toBeNull();
      expect(await awardXpForSite('anime', 'u', 1, 'play', client(data))).toBeNull();
    }
  });

  it('takes the service role client itself when none is given, and uses the one given otherwise', async () => {
    created.n = 0;
    expect(await awardXpForSite('kpop', 'user-3', 1, 'play_received')).toBe(42);
    expect(created.n).toBe(1);
    expect(created.calls).toEqual([{ fn: 'award_xp', args: { p_user_id: 'user-3', p_amount: 1, p_reason: 'play_received' } }]);
    created.calls = [];
    await awardXpForSite('anime', 'user-3', 1, 'game_play', client(1));
    expect(created.n).toBe(1);
    expect(created.calls).toEqual([]);
  });

  it('xpRpcFor names the rpc and builds the arguments', () => {
    expect(xpRpcFor('kpop', 'u', 3, 'r')).toEqual({ fn: 'award_xp', args: { p_user_id: 'u', p_amount: 3, p_reason: 'r' } });
    expect(xpRpcFor('anime', 'u', 3, 'r')).toEqual({ fn: 'award_world_xp', args: { p_user: 'u', p_site: 'anime', p_amount: 3, p_reason: 'r' } });
  });
});
