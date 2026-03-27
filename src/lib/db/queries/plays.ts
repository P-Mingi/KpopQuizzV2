import { createServerClient } from '@/lib/supabase/server';

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
  const supabase = await createServerClient();

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
