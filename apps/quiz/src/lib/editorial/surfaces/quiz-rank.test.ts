// V12 F5a: the results rank reads (lib/editorial/surfaces/quiz-rank.ts). Flag off:
// exactly today's RPC (name and arguments) and no editorial read. Flag on with an
// editorial account: the v12 twin with p_exclude_team = true. Twin missing (SQL not
// applied) or failing: today's RPC again (fail soft). The fake answers like the dry run
// of docs/pending-migrations/v12-f5-quiz-rank.sql (run/reports/F5/f5a/sql-dryrun.txt):
// fan F1 is #2 of 4 today and #1 of 3 without the editorial player.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const MINA = '11111111-1111-4111-8111-111111111111';
const state = vi.hoisted(() => ({ team: [] as Array<Record<string, unknown>>, reads: [] as string[] }));
vi.mock('@/lib/supabase/server', () => {
  const svc = {
    from: (t: string) => {
      state.reads.push(t);
      const q = { select: () => q, order: () => q, limit: async () => ({ data: state.team, error: null, status: 200 }) };
      return q;
    },
  };
  return { createServiceRoleClient: () => svc, createPublicReadClient: () => svc, createServerClient: async () => svc };
});

const TODAY = { best_score: 7, total_questions: 8, rank: 2, total_players: 4 };
const NO_TEAM = { best_score: 7, total_questions: 8, rank: 1, total_players: 3 };

function fakeDb(twinApplied: boolean): { db: SupabaseClient; calls: Array<[string, Record<string, unknown>]> } {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const db = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push([fn, args]);
      if (fn.endsWith('_v12')) {
        if (!twinApplied) return { data: null, error: { message: 'Could not find the function', code: 'PGRST202' } };
        return { data: fn.startsWith('get_quiz_rank_for_score') ? [{ rank: 1, total_players: 3 }] : [NO_TEAM], error: null };
      }
      return { data: fn.startsWith('get_quiz_rank_for_score') ? [{ rank: 2, total_players: 4 }] : [TODAY], error: null };
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

async function load(v12: boolean, team: boolean): Promise<typeof import('./quiz-rank')> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  state.reads.length = 0;
  state.team = team ? [{ user_id: MINA, display_name: 'Mina', beat: 'news', active: true }] : [];
  return import('./quiz-rank');
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('results rank without editorial players (F5a)', () => {
  it('flag off: today\'s two RPCs, same arguments, no editorial read', async () => {
    const m = await load(false, true);
    const { db, calls } = fakeDb(true);
    expect((await m.quizRankForUser(db, 'q1', 'u1')).data).toEqual([TODAY]);
    expect((await m.quizRankForScore(db, 'q1', 7)).data).toEqual([{ rank: 2, total_players: 4 }]);
    expect(calls).toEqual([['get_quiz_rank', { p_quiz_id: 'q1', p_user_id: 'u1' }], ['get_quiz_rank_for_score', { p_quiz_id: 'q1', p_score: 7 }]]);
    expect(state.reads).toEqual([]);
  });

  it('flag on with an editorial account: the v12 twins with p_exclude_team true', async () => {
    const m = await load(true, true);
    const { db, calls } = fakeDb(true);
    expect((await m.quizRankForUser(db, 'q1', 'u1')).data).toEqual([NO_TEAM]);
    expect((await m.quizRankForScore(db, 'q1', 7)).data).toEqual([{ rank: 1, total_players: 3 }]);
    expect(calls).toEqual([
      ['get_quiz_rank_v12', { p_quiz_id: 'q1', p_user_id: 'u1', p_exclude_team: true }],
      ['get_quiz_rank_for_score_v12', { p_quiz_id: 'q1', p_score: 7, p_exclude_team: true }],
    ]);
  });

  it('flag on, SQL not applied: falls back to today\'s RPC and answer', async () => {
    const m = await load(true, true);
    const { db, calls } = fakeDb(false);
    const r = await m.quizRankForUser(db, 'q1', 'u1');
    expect(r).toEqual({ data: [TODAY], error: null });
    expect(calls.map((c) => c[0])).toEqual(['get_quiz_rank_v12', 'get_quiz_rank']);
  });

  it('flag on, no editorial account yet: today\'s RPC only', async () => {
    const m = await load(true, false);
    const { db, calls } = fakeDb(true);
    await m.quizRankForUser(db, 'q1', 'u1');
    expect(calls).toEqual([['get_quiz_rank', { p_quiz_id: 'q1', p_user_id: 'u1' }]]);
  });
});
