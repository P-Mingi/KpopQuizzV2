// Run O1, lot (e) part 1 (K1): which RPC publishes the daily quiz of a site. kpop keeps today's call shape; any other site
// goes through ensure_daily_quiz_v2 with its id.
import { describe, expect, it } from 'vitest';

import { ensureDailyQuizRpc } from './daily-quiz';

import type { SupabaseClient } from '@supabase/supabase-js';

function fake() {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const db = {
    rpc(fn: string, args: unknown) {
      calls.push({ fn, args });
      return Promise.resolve({ data: 'quiz-id', error: null });
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

describe('ensureDailyQuizRpc', () => {
  it('kpop: ensure_daily_quiz with p_date only (today\'s call, unchanged)', async () => {
    const { db, calls } = fake();
    const res = await ensureDailyQuizRpc(db, '2026-10-20', 'kpop');
    expect(calls).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-20' } }]);
    expect(res).toEqual({ data: 'quiz-id', error: null });
  });

  it('anime: ensure_daily_quiz_v2 with p_date and p_site', async () => {
    const { db, calls } = fake();
    await ensureDailyQuizRpc(db, '2026-10-20', 'anime');
    expect(calls).toEqual([{ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-20', p_site: 'anime' } }]);
  });

  it('hub: also the v2 function (the database answers null for a site without a daily)', async () => {
    const { db, calls } = fake();
    await ensureDailyQuizRpc(db, '2026-10-20', 'hub');
    expect(calls[0]).toEqual({ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-20', p_site: 'hub' } });
  });

  it('no site given: this build\'s site (kpop in the unit tests)', async () => {
    const { db, calls } = fake();
    await ensureDailyQuizRpc(db, '2026-10-20');
    expect(calls).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-20' } }]);
  });
});
