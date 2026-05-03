import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    mode_id: string;
    score: number;
    total: number;
    song_ids: string[];
    choices: Record<string, { picked: number; correct: boolean; time: number }>;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const playerId = user?.id ?? null;

  // Record the play
  await supabase.from('blind_test_plays').insert({
    player_id: playerId,
    mode_id: body.mode_id,
    score: body.score,
    total: body.total,
    song_ids: body.song_ids,
    choices: body.choices,
  });

  // Update per-song stats
  for (const [songId, choice] of Object.entries(body.choices)) {
    const { data: song } = await supabase
      .from('blind_test_songs')
      .select('times_played, times_correct, avg_answer_time')
      .eq('id', songId)
      .single();

    if (!song) continue;

    const newPlayed = song.times_played + 1;
    const newCorrect = song.times_correct + (choice.correct ? 1 : 0);
    const answerTime = choice.time || 10;
    const newAvg = song.times_played === 0
      ? answerTime
      : (song.avg_answer_time * song.times_played + answerTime) / newPlayed;

    await supabase
      .from('blind_test_songs')
      .update({
        times_played: newPlayed,
        times_correct: newCorrect,
        avg_answer_time: Math.round(newAvg * 10) / 10,
        updated_at: new Date().toISOString(),
      })
      .eq('id', songId);
  }

  // Award XP and Byeol
  let xpEarned = 0;
  let byeolEarned = 0;
  if (playerId) {
    xpEarned = Math.min(body.score * 5, 50);
    if (xpEarned > 0) {
      try {
        await supabase.rpc('award_xp', {
          p_user_id: playerId,
          p_amount: xpEarned,
          p_reason: 'blind_test',
        });
      } catch { /* XP is non-critical */ }
    }

    // Award Byeol (one-time per blindtest mode via anti-farming RPC)
    const { data: rewardResult } = await supabase.rpc('award_first_time_byeol', {
      p_user_id: playerId,
      p_content_type: 'blindtest',
      p_content_id: body.mode_id,
      p_score: body.score,
      p_total_questions: body.total,
    });
    const reward = Array.isArray(rewardResult) ? rewardResult[0] : rewardResult;
    byeolEarned = reward?.byeol_awarded ?? 0;
  }

  return NextResponse.json({
    success: true,
    xp_earned: xpEarned,
    byeol_earned: byeolEarned,
    was_first_time: byeolEarned > 0,
  });
}
