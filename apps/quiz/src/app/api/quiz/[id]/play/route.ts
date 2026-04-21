import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { notifyMilestone } from '@/lib/notifications';
import { getLevelInfo } from '@/lib/constants';
import { awardByeol, BYEOL_REWARDS, checkXpConversion } from '@/lib/byeol';

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

  const { score, total_questions, time_taken_seconds, max_score, per_question_times } = body as Record<string, unknown>;

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

    // Fetch quiz meta post-increment (used for badges, creator XP, and
    // milestone notifications - both authenticated and anonymous plays).
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('difficulty, creator_id, play_count, title')
      .eq('id', id)
      .single();

    // Milestone notification (fires for ALL plays that hit a threshold,
    // regardless of whether the player was signed in).
    if (quizData && quizData.creator_id && quizData.creator_id !== playerId) {
      await notifyMilestone({
        creatorId: quizData.creator_id as string,
        quizId: id,
        quizTitle: (quizData.title as string) ?? '',
        playCount: quizData.play_count as number,
      });
    }

    // Award XP to the player if logged in
    let xpEarned = 0;
    let newXp: number | null = null;
    let leveledUp = false;
    let newLevel: number | null = null;
    let newLevelName: string | null = null;
    if (playerId) {
      let xpAmount = 10; // base: completed quiz
      const scorePct = score / effectiveMaxScore;
      if (scorePct >= 0.7) xpAmount += 5; // pass bonus
      if (scorePct === 1.0) xpAmount += 15; // perfect bonus
      xpEarned = xpAmount;

      const { data: newXpValue } = await supabase.rpc('award_xp', {
        p_user_id: playerId,
        p_amount: xpAmount,
        p_reason: 'play',
      });

      if (typeof newXpValue === 'number') {
        newXp = newXpValue;
        const oldXp = Math.max(0, newXpValue - xpAmount);
        const oldLevel = getLevelInfo(oldXp).level;
        const newLevelInfo = getLevelInfo(newXpValue);
        if (newLevelInfo.level > oldLevel) {
          leveledUp = true;
          newLevel = newLevelInfo.level;
          newLevelName = newLevelInfo.name;
        }
        await checkXpConversion(playerId, oldXp, newXpValue);
      }

      // Check for perfect_score badge
      if (score === effectiveMaxScore) {
        await supabase.from('user_badges').upsert(
          { user_id: playerId, badge_id: 'perfect_score' },
          { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
        );
      }

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

      // Award Byeol
      const byeolAmount = BYEOL_REWARDS.quiz_complete(score as number, total_questions as number);
      await awardByeol(playerId, byeolAmount, 'quiz_complete', id);
    }

    // Save per-question times if provided
    if (Array.isArray(per_question_times)) {
      await supabase
        .from('plays')
        .update({ per_question_times })
        .eq('id', result?.play_id);
    }

    // Update time stats cache
    const timeTaken = typeof time_taken_seconds === 'number' ? time_taken_seconds : null;
    if (timeTaken && timeTaken > 0) {
      try {
        const { data: existing } = await supabase
          .from('quiz_time_stats')
          .select('*')
          .eq('quiz_id', id)
          .eq('score', score)
          .eq('total_questions', total_questions)
          .single();

        if (existing) {
          const newCount = (existing.attempt_count as number) + 1;
          const oldAvg = existing.avg_time_seconds as number;
          const newAvg = ((oldAvg * (existing.attempt_count as number)) + timeTaken) / newCount;
          const oldFastest = existing.fastest_time_seconds as number | null;
          const newFastest = oldFastest !== null ? Math.min(oldFastest, timeTaken) : timeTaken;

          await supabase.from('quiz_time_stats').update({
            attempt_count: newCount,
            avg_time_seconds: Math.round(newAvg * 10) / 10,
            fastest_time_seconds: Math.round(newFastest * 10) / 10,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('quiz_time_stats').insert({
            quiz_id: id,
            score: score as number,
            total_questions: total_questions as number,
            attempt_count: 1,
            avg_time_seconds: Math.round(timeTaken * 10) / 10,
            fastest_time_seconds: Math.round(timeTaken * 10) / 10,
          });
        }
      } catch {
        // Non-critical - don't fail the play save
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

    // Compute Byeol earned for response (mirrors the award above, 0 if anonymous)
    const byeolEarned = playerId ? BYEOL_REWARDS.quiz_complete(score as number, total_questions as number) : 0;

    return NextResponse.json({
      play_id: result?.play_id ?? null,
      percentile: result?.percentile ?? 50,
      xp_earned: xpEarned,
      pass_rate: passRate,
      new_xp: newXp,
      leveled_up: leveledUp,
      new_level: newLevel,
      new_level_name: newLevelName,
      byeol_earned: byeolEarned,
    });
  } catch (err) {
    console.error('Failed to record play:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
