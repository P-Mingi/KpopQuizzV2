// V12 F5a: the results rank "#N of M players" without the editorial accounts (owner
// decision 2026-10-03: they never act as fans). Server only. Drop-in for the two rank
// reads of GET /api/ux-v1/p4/standing:
//   flag off, or no active editorial account   today's RPC, same name and arguments,
//                                              and nothing else is read
//   flag on with editorial accounts            the v12 twin with p_exclude_team = true
//                                              (docs/pending-migrations/v12-f5-quiz-rank.sql)
//   twin missing (SQL not applied) or failing  today's RPC (fail soft, never a 500, never
//                                              an invented number)

import { teamIdsToExclude } from '@/lib/db/queries/profiles';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface RankRpcAnswer {
  data: unknown;
  error: { message: string } | null;
}

async function call(db: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<RankRpcAnswer> {
  const { data, error } = await db.rpc(fn, args);
  return { data, error };
}

async function withoutTeam(db: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<RankRpcAnswer> {
  if (!(await teamIdsToExclude())) return call(db, fn, args);
  const v12 = await call(db, `${fn}_v12`, { ...args, p_exclude_team: true });
  return v12.error ? call(db, fn, args) : v12;
}

/** get_quiz_rank(p_quiz_id, p_user_id): the signed-in fan's best, rank and player count. */
export function quizRankForUser(db: SupabaseClient, quizId: string, userId: string): Promise<RankRpcAnswer> {
  return withoutTeam(db, 'get_quiz_rank', { p_quiz_id: quizId, p_user_id: userId });
}

/** get_quiz_rank_for_score(p_quiz_id, p_score): where a guest score lands. */
export function quizRankForScore(db: SupabaseClient, quizId: string, score: number): Promise<RankRpcAnswer> {
  return withoutTeam(db, 'get_quiz_rank_for_score', { p_quiz_id: quizId, p_score: score });
}
