// Run O1, lot (c) part 2 (B3): awardDailyStreak. The kpop path is unchanged (profiles + award_xp + the kpop side
// effects); another site reads and writes its world_memberships row and awards through award_world_xp.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/notifications', () => ({ notifyPassportMilestone: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => { throw new Error('not used: the client is passed'); } }));

import { notifyPassportMilestone } from '@/lib/notifications';

import { awardDailyStreak } from './daily-streak';

import type { SupabaseClient } from '@supabase/supabase-js';

interface Op { op: string; table?: string; fn?: string; arg?: unknown; filters: Array<[string, unknown]> }

function fake(row: Record<string, unknown> | null) {
  const ops: Op[] = [];
  const client = {
    from(table: string) {
      const o: Op = { op: 'select', table, filters: [] };
      const q: Record<string, unknown> = {};
      q.select = (cols: string) => { o.op = 'select'; o.arg = cols; ops.push(o); return q; };
      q.update = (arg: unknown) => { o.op = 'update'; o.arg = arg; ops.push(o); return q; };
      q.insert = (arg: unknown) => { o.op = 'insert'; o.arg = arg; ops.push(o); return q; };
      q.eq = (k: string, v: unknown) => { o.filters.push([k, v]); return q; };
      q.maybeSingle = async () => ({ data: row, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: null });
      return q;
    },
    rpc: async (fn: string, arg: unknown) => {
      ops.push({ op: 'rpc', fn, arg, filters: [] });
      return { data: 77, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, ops };
}

const today = (): string => new Date().toISOString().slice(0, 10);
const yesterday = (): string => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

beforeEach(() => vi.mocked(notifyPassportMilestone).mockClear());
afterEach(() => vi.useRealTimers());

describe('awardDailyStreak on kpop (unchanged)', () => {
  it('reads profiles, updates profiles, awards through award_xp with the same arguments', async () => {
    const { client, ops } = fake({ daily_streak: 2, daily_streak_longest: 2, last_daily_date: yesterday() });
    const r = await awardDailyStreak(client, 'user-1', 'kpop');
    expect(r).toEqual({ awarded: 15, base: 5, milestone: 10, streak: 3, longest: 3, alreadyToday: false });
    expect(ops.map((o) => `${o.op}:${o.table ?? o.fn}`)).toEqual([
      'select:profiles', 'update:profiles', 'rpc:award_xp', 'rpc:emit_activity',
    ]);
    expect(ops[0]!.filters).toEqual([['id', 'user-1']]);
    expect(ops[1]!.arg).toEqual({ daily_streak: 3, daily_streak_longest: 3, last_daily_date: today() });
    expect(ops[2]!.arg).toEqual({ p_user_id: 'user-1', p_amount: 15, p_reason: 'daily_streak' });
    expect(notifyPassportMilestone).toHaveBeenCalledTimes(1);
  });

  it('is the default on the kpop build (no site argument)', async () => {
    const { client, ops } = fake(null);
    const r = await awardDailyStreak(client, 'user-1');
    expect(r).toMatchObject({ awarded: 5, streak: 1, alreadyToday: false });
    expect(ops[0]!.table).toBe('profiles');
  });

  it('a second daily on the same day is a no-op', async () => {
    const { client, ops } = fake({ daily_streak: 4, daily_streak_longest: 9, last_daily_date: today() });
    expect(await awardDailyStreak(client, 'user-1', 'kpop')).toEqual({ awarded: 0, base: 0, milestone: 0, streak: 4, longest: 9, alreadyToday: true });
    expect(ops).toHaveLength(1);
  });

  it('grants the streak badges at 7 days', async () => {
    const { client, ops } = fake({ daily_streak: 6, daily_streak_longest: 6, last_daily_date: yesterday() });
    await awardDailyStreak(client, 'user-1', 'kpop');
    expect(ops.map((o) => o.fn ?? o.table)).toContain('grant_streak_badges');
  });
});

describe('awardDailyStreak on anime', () => {
  it('reads and updates the anime world_memberships row and awards through award_world_xp', async () => {
    const { client, ops } = fake({ daily_streak: 2, daily_streak_longest: 5, last_daily_date: yesterday() });
    const r = await awardDailyStreak(client, 'user-1', 'anime');
    expect(r).toEqual({ awarded: 15, base: 5, milestone: 10, streak: 3, longest: 5, alreadyToday: false });
    expect(ops.map((o) => `${o.op}:${o.table ?? o.fn}`)).toEqual(['select:world_memberships', 'update:world_memberships', 'rpc:award_world_xp']);
    expect(ops[0]!.filters).toEqual([['user_id', 'user-1'], ['site_id', 'anime']]);
    expect(ops[1]!.filters).toEqual([['user_id', 'user-1'], ['site_id', 'anime']]);
    expect(ops[1]!.arg).toEqual({ daily_streak: 3, daily_streak_longest: 5, last_daily_date: today() });
    expect(ops[2]!.arg).toEqual({ p_user: 'user-1', p_site: 'anime', p_amount: 15, p_reason: 'daily_streak' });
  });

  it('never touches profiles, never fires the kpop-only badges, activity or notification', async () => {
    const { client, ops } = fake({ daily_streak: 6, daily_streak_longest: 6, last_daily_date: yesterday() });
    await awardDailyStreak(client, 'user-1', 'anime');
    expect(ops.some((o) => o.table === 'profiles')).toBe(false);
    expect(ops.some((o) => o.fn === 'grant_streak_badges' || o.fn === 'emit_activity' || o.fn === 'award_xp')).toBe(false);
    expect(notifyPassportMilestone).not.toHaveBeenCalled();
  });

  it('the first daily of a member with no row creates the stamp (joined by playing)', async () => {
    const { client, ops } = fake(null);
    const r = await awardDailyStreak(client, 'user-1', 'anime');
    expect(r).toMatchObject({ awarded: 5, streak: 1, longest: 1, alreadyToday: false });
    const insert = ops.find((o) => o.op === 'insert')!;
    expect(insert.table).toBe('world_memberships');
    expect(insert.arg).toMatchObject({
      user_id: 'user-1', site_id: 'anime', joined_via: 'play', daily_streak: 1, daily_streak_longest: 1, last_daily_date: today(),
    });
    expect(ops.some((o) => o.op === 'update')).toBe(false);
  });

  it('a second daily on the same day is a no-op, and a missed day resets the streak', async () => {
    const same = fake({ daily_streak: 4, daily_streak_longest: 9, last_daily_date: today() });
    expect(await awardDailyStreak(same.client, 'user-1', 'anime')).toMatchObject({ awarded: 0, alreadyToday: true, streak: 4 });
    expect(same.ops).toHaveLength(1);
    const missed = fake({ daily_streak: 4, daily_streak_longest: 9, last_daily_date: '2020-01-01' });
    expect(await awardDailyStreak(missed.client, 'user-1', 'anime')).toMatchObject({ streak: 1, longest: 9 });
  });
});
