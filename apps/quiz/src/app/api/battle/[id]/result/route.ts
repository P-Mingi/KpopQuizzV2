import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';
import { BATTLE_QUESTION_COUNT } from '@/lib/battle/select-questions';
import { notifyRunBeaten } from '@/lib/notifications';

import type { NextRequest } from 'next/server';

// E2 - POST /api/battle/[id]/result { score, per_question: bool[], time_ms }
// Records the player's run (service role). If the player is the challenger and the
// battle's challenger_score is still null, finalize it. Anon-first.
//
// Passport (M0.2): when the runner is signed in we stamp user_id on the result
// row. The trg_passport_on_battle_result trigger deposits battles_played /
// battles_won in the SAME insert transaction (no extra round trip here). A unique
// (battle_id, user_id) index makes a replayed run a no-op, so counters cannot
// inflate; we surface that as already_recorded, mirroring the battle/confirm dedup.
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { score?: unknown; per_question?: unknown; time_ms?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const score = body.score;
  const perQuestion = body.per_question;
  const timeMs = body.time_ms;

  if (
    typeof score !== 'number' || score < 0 ||
    !Array.isArray(perQuestion) || perQuestion.length === 0 || perQuestion.length > 50 ||
    !perQuestion.every((b) => typeof b === 'boolean') ||
    typeof timeMs !== 'number' || timeMs < 0
  ) {
    return NextResponse.json({ error: 'Invalid result payload' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, challenger_hash, challenger_score, questions')
    .eq('id', id)
    .maybeSingle();
  if (!battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  // W2: the score ceiling is the battle's OWN question count, not a hardcoded 7.
  // Quick-match battles are 7 (BATTLE_QUESTION_COUNT), but a challenge created from
  // a played quiz (POST /api/battle/challenge) carries that quiz's real length, and
  // a 10-question run used to be rejected here as an invalid payload. Existing rows
  // all hold 7, so this is identical for them and correct for the new ones.
  const questionCount = Array.isArray(battle.questions) ? battle.questions.length : BATTLE_QUESTION_COUNT;
  if (score > questionCount) {
    return NextResponse.json({ error: 'Invalid result payload' }, { status: 400 });
  }

  const playerHash = anonHash(req);

  // Validated user_id (server-side JWT, never client input). Stamped on the row so
  // the passport trigger can attribute battles_played / battles_won.
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const userId = user?.id ?? null;

  const { data: result, error } = await supabase
    .from('battle_results')
    .insert({
      battle_id: id,
      player_hash: playerHash,
      user_id: userId,
      score,
      per_question: perQuestion,
      time_ms: Math.round(timeMs),
    })
    .select('id, battle_id, score, per_question, time_ms, created_at')
    .single();

  if (error || !result) {
    // Unique (battle_id, user_id) violation = this signed-in player already has a
    // recorded run for this battle. No-op for the passport counters.
    if (userId && error?.code === '23505') {
      return NextResponse.json({ already_recorded: true });
    }
    console.error('Failed to record battle result:', error?.message);
    return NextResponse.json({ error: 'Could not record result' }, { status: 500 });
  }

  // Finalize the challenger's score on their first (originating) run.
  let isChallenger = false;
  if (playerHash === battle.challenger_hash && battle.challenger_score === null) {
    await supabase
      .from('battles')
      .update({ challenger_score: score })
      .eq('id', id)
      .is('challenger_score', null);
    isChallenger = true;
  }

  // W2 - the return hook: the challenger learns their run was beaten. Only
  // reachable when the challenger was signed in (creator_notifications.user_id is
  // NOT NULL), so anonymous challengers get nothing and nothing here can fail the
  // result write. Fires only on a genuine beat by a genuine other player.
  if (!isChallenger && battle.challenger_score !== null && score > (battle.challenger_score as number)) {
    const { data: challengerRow } = await supabase
      .from('battle_results')
      .select('user_id')
      .eq('battle_id', id)
      .eq('player_hash', battle.challenger_hash)
      .not('user_id', 'is', null)
      .limit(1)
      .maybeSingle<{ user_id: string }>();
    if (challengerRow?.user_id && challengerRow.user_id !== userId) {
      let quizTitle: string | null = null;
      const { data: b2 } = await supabase.from('battles').select('quiz_id').eq('id', id).maybeSingle<{ quiz_id: string | null }>();
      if (b2?.quiz_id) {
        const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', b2.quiz_id).maybeSingle<{ title: string }>();
        quizTitle = quiz?.title ?? null;
      }
      await notifyRunBeaten({
        challengerUserId: challengerRow.user_id,
        battleId: id,
        winnerScore: score,
        challengerScore: battle.challenger_score as number,
        quizTitle,
      });
    }
  }

  return NextResponse.json({ result, is_challenger: isChallenger });
}
