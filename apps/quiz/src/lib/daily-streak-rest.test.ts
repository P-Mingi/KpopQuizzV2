// Audit 01 P1-6 / P2-11 on the server: the free rest day and the browser's local date.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/notifications', () => ({ notifyPassportMilestone: vi.fn(async () => {}) }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => { throw new Error('not used'); } }));

import { awardDailyStreak } from './daily-streak';

import type { SupabaseClient } from '@supabase/supabase-js';

function fake(row: Record<string, unknown>, restRow: { daily_rest_used_on: string | null } | 'no-column') {
  const updates: unknown[] = [];
  const client = {
    from() {
      let cols = '';
      let isUpdate = false;
      const q: Record<string, unknown> = {};
      q.select = (c: string) => { cols = c; return q; };
      q.update = (a: unknown) => { isUpdate = true; updates.push(a); return q; };
      q.eq = () => q;
      q.maybeSingle = async () => (cols === 'daily_rest_used_on'
        ? (restRow === 'no-column' ? { data: null, error: { message: 'column does not exist' } } : { data: restRow, error: null })
        : { data: row, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: isUpdate ? null : null });
      return q;
    },
    rpc: async () => ({ data: 1, error: null }),
  };
  return { client: client as unknown as SupabaseClient, updates };
}

describe('awardDailyStreak: rest day and local date', () => {
  it('one missed day is covered by the rest day and the update records it', async () => {
    const { client, updates } = fake({ daily_streak: 4, daily_streak_longest: 4, last_daily_date: '2026-11-05' }, { daily_rest_used_on: null });
    const r = await awardDailyStreak(client, 'u', 'kpop', { localDate: '2026-11-07' });
    expect(r.streak).toBe(5);
    expect(updates[0]).toMatchObject({ daily_streak: 5, last_daily_date: '2026-11-07', daily_rest_used_on: '2026-11-06' });
  });
  it('no rest day when one was used less than 7 days ago, or when the column is not there yet', async () => {
    const a = fake({ daily_streak: 4, daily_streak_longest: 4, last_daily_date: '2026-11-05' }, { daily_rest_used_on: '2026-11-03' });
    expect((await awardDailyStreak(a.client, 'u', 'kpop', { localDate: '2026-11-07' })).streak).toBe(1);
    const b = fake({ daily_streak: 4, daily_streak_longest: 4, last_daily_date: '2026-11-05' }, 'no-column');
    expect((await awardDailyStreak(b.client, 'u', 'kpop', { localDate: '2026-11-07' })).streak).toBe(1);
  });
  it('a local date behind UTC that is already recorded is a no-op', async () => {
    const { client } = fake({ daily_streak: 4, daily_streak_longest: 4, last_daily_date: '2026-11-07' }, { daily_rest_used_on: null });
    expect((await awardDailyStreak(client, 'u', 'kpop', { localDate: '2026-11-07' })).alreadyToday).toBe(true);
  });
});
