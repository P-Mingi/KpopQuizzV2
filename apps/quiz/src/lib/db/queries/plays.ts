import { createServerClient, createPublicReadClient } from '@/lib/supabase/server';

import type { RecordPlayResult } from '@/lib/db/types';

export async function recordPlay(
  quizId: string,
  playerId: string | null,
  score: number,
  totalQuestions: number,
  timeTakenSeconds: number | null,
): Promise<RecordPlayResult> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('record_play', {
    p_quiz_id: quizId,
    p_player_id: playerId,
    p_score: score,
    p_total_questions: totalQuestions,
    p_time_taken_seconds: timeTakenSeconds,
  });

  if (error) throw new Error(`Failed to record play: ${error.message}`);

  const result = data as unknown as RecordPlayResult[] | RecordPlayResult;
  if (Array.isArray(result)) {
    const first = result[0];
    if (!first) throw new Error('No result returned from record_play');
    return first;
  }
  return result;
}

export async function getPassRate(quizId: string, totalQuestions: number): Promise<number> {
  // Public quiz stats - cookie-free so /q/[slug] stays ISR-cacheable.
  const supabase = createPublicReadClient();

  const { count: totalPlays, error: totalError } = await supabase
    .from('plays')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId);

  if (totalError) throw new Error(`Failed to get pass rate: ${totalError.message}`);
  if (!totalPlays || totalPlays === 0) return 0;

  const passingScore = Math.ceil(totalQuestions * 0.7);
  const { count: passingPlays, error: passError } = await supabase
    .from('plays')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .gte('score', passingScore);

  if (passError) throw new Error(`Failed to get pass rate: ${passError.message}`);
  return Math.round(((passingPlays ?? 0) / totalPlays) * 100);
}

/**
 * SEO-3 U1: extra per-quiz stats that were not on the quiz row itself.
 * Real values only - honest emptiness (null) when the DB has nothing.
 * Cookie-free so /q/[slug] stays ISR-cacheable.
 */
export interface QuizExtraStats {
  fastestTimeSeconds: number | null; // fastest COMPLETED play (any score)
  perfectScoreCount: number; // plays where score === total_questions
  passingPlays: number; // plays where score >= 0.7 * total_questions
  totalPlaysWithScore: number; // plays rows for this quiz
}

export async function getQuizExtraStats(
  quizId: string,
  totalQuestions: number,
): Promise<QuizExtraStats> {
  const supabase = createPublicReadClient();

  const passingScore = Math.ceil(totalQuestions * 0.7);

  // Fastest COMPLETED play: any play that reached total_questions with a
  // non-null time. This is real: it comes from plays.time_taken_seconds.
  const [fastest, perfect, passing, total] = await Promise.all([
    supabase
      .from('plays')
      .select('time_taken_seconds')
      .eq('quiz_id', quizId)
      .eq('score', totalQuestions)
      .not('time_taken_seconds', 'is', null)
      .order('time_taken_seconds', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('score', totalQuestions),
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .gte('score', passingScore),
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId),
  ]);

  const fastestRow = fastest.data as { time_taken_seconds: number | null } | null;

  return {
    fastestTimeSeconds: fastestRow?.time_taken_seconds ?? null,
    perfectScoreCount: perfect.count ?? 0,
    passingPlays: passing.count ?? 0,
    totalPlaysWithScore: total.count ?? 0,
  };
}
