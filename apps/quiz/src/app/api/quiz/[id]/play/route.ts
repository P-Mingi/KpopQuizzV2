import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { score, total_questions, time_taken_seconds, max_score } = body as Record<string, unknown>;

  if (typeof score !== 'number' || typeof total_questions !== 'number') {
    return NextResponse.json({ error: 'score and total_questions are required' }, { status: 400 });
  }

  // max_score is sent for guess_from_clues (questions * 3), defaults to total_questions
  const effectiveMaxScore = typeof max_score === 'number' && max_score > 0 ? max_score : total_questions;

  if (score < 0 || score > effectiveMaxScore) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Get player ID if authenticated (optional)
  const { data: { user } } = await supabase.auth.getUser();
  const playerId = user?.id ?? null;

  try {
    const { data, error } = await supabase.rpc('record_play', {
      p_quiz_id: id,
      p_player_id: playerId,
      p_score: score,
      p_total_questions: total_questions,
      p_time_taken_seconds: typeof time_taken_seconds === 'number' ? time_taken_seconds : null,
    });

    if (error) {
      console.error('Failed to record play:', error);
      return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    // Award XP to the player if logged in
    let xpEarned = 0;
    if (playerId) {
      let xpAmount = 10; // base: completed quiz
      const scorePct = score / effectiveMaxScore;
      if (scorePct >= 0.7) xpAmount += 5; // pass bonus
      if (scorePct === 1.0) xpAmount += 15; // perfect bonus
      xpEarned = xpAmount;

      await supabase.rpc('award_xp', {
        p_user_id: playerId,
        p_amount: xpAmount,
        p_reason: 'play',
      });

      // Check for perfect_score badge
      if (score === effectiveMaxScore) {
        await supabase.from('user_badges').upsert(
          { user_id: playerId, badge_id: 'perfect_score' },
          { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
        );
      }

      // Check for hard_mode badge
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('difficulty, creator_id, play_count')
        .eq('id', id)
        .single();

      if (quizData) {
        if (quizData.difficulty === 'hard' && score / effectiveMaxScore >= 0.7) {
          await supabase.from('user_badges').upsert(
            { user_id: playerId, badge_id: 'hard_mode' },
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
          );
        }

        // Award XP to quiz creator (+1 per play, cap at 500)
        if (quizData.creator_id && quizData.creator_id !== playerId && quizData.play_count < 500) {
          await supabase.rpc('award_xp', {
            p_user_id: quizData.creator_id,
            p_amount: 1,
            p_reason: 'play_received',
          });
        }

        // Check viral_hit badge for creator
        if (quizData.creator_id && quizData.play_count + 1 >= 1000) {
          await supabase.from('user_badges').upsert(
            { user_id: quizData.creator_id, badge_id: 'viral_hit' },
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
          );
        }
      }
    }

    // Compute pass rate
    let passRate: number | null = null;
    if (total_questions > 0) {
      const passingScore = Math.ceil(effectiveMaxScore * 0.7);
      const { count: totalPlays } = await supabase
        .from('plays')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', id);
      const { count: passingPlays } = await supabase
        .from('plays')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', id)
        .gte('score', passingScore);

      if (totalPlays && totalPlays > 0) {
        passRate = Math.round(((passingPlays ?? 0) / totalPlays) * 100);
      }
    }

    return NextResponse.json({
      play_id: result?.play_id ?? null,
      percentile: result?.percentile ?? 50,
      xp_earned: xpEarned,
      pass_rate: passRate,
    });
  } catch (err) {
    console.error('Failed to record play:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
