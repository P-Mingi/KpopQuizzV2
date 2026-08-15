import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';
import { selectBattleQuestions, BATTLE_QUESTION_COUNT } from '@/lib/battle/select-questions';

import type { NextRequest } from 'next/server';

// E2 - POST /api/battle/start { quizId? | groupSlug? }
// Selects 7 four-option questions from the quiz bank, snapshots them onto a new
// battles row, and returns them (client scores, like the quiz player). Anon-first:
// challenger_hash = sha256(ip+day). Service role (server-only, never client-direct).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { quizId?: string; groupSlug?: string; generation?: string; difficulty?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.quizId && !body.groupSlug && !body.generation) {
    return NextResponse.json({ error: 'quizId, groupSlug or generation required' }, { status: 400 });
  }
  // W2b B3: only the three difficulties that exist on quizzes.difficulty.
  const difficulty = body.difficulty && ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : null;

  const supabase = createServiceRoleClient();

  const sel = await selectBattleQuestions(supabase, {
    quizId: body.quizId ?? null,
    groupSlug: body.groupSlug ?? null,
    generation: body.generation ?? null,
    difficulty,
  });
  if (sel.questions.length < BATTLE_QUESTION_COUNT) {
    // W2b: a filtered pick that cannot fill a battle says so honestly instead of
    // being widened into a different battle than the one the player chose.
    const what = [body.generation, difficulty, body.groupSlug].filter(Boolean).join(' ');
    return NextResponse.json(
      {
        error: what
          ? `Not enough ${what} questions for a battle yet. Try another pick.`
          : 'Not enough questions for a battle',
        available: sel.questions.length,
        needed: BATTLE_QUESTION_COUNT,
      },
      { status: 400 },
    );
  }

  const challengerHash = anonHash(req);
  const questionIds = sel.questions.map(() => crypto.randomUUID());

  const { data, error } = await supabase
    .from('battles')
    .insert({
      quiz_id: sel.quizId,
      group_slug: sel.groupSlug,
      question_ids: questionIds,
      questions: sel.questions,
      challenger_hash: challengerHash,
      challenger_score: null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to start battle:', error?.message);
    return NextResponse.json({ error: 'Could not start battle' }, { status: 500 });
  }

  return NextResponse.json({ battleId: data.id, questions: sel.questions });
}
