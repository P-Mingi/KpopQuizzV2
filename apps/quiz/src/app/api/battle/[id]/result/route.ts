import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';
import { BATTLE_QUESTION_COUNT } from '@/lib/battle/select-questions';

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
    typeof score !== 'number' || score < 0 || score > BATTLE_QUESTION_COUNT ||
    !Array.isArray(perQuestion) || perQuestion.length === 0 || perQuestion.length > 20 ||
    !perQuestion.every((b) => typeof b === 'boolean') ||
    typeof timeMs !== 'number' || timeMs < 0
  ) {
    return NextResponse.json({ error: 'Invalid result payload' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, challenger_hash, challenger_score')
    .eq('id', id)
    .maybeSingle();
  if (!battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
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

  return NextResponse.json({ result, is_challenger: isChallenger });
}
