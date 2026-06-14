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
  let body: { quizId?: string; groupSlug?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.quizId && !body.groupSlug) {
    return NextResponse.json({ error: 'quizId or groupSlug required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const sel = await selectBattleQuestions(supabase, { quizId: body.quizId ?? null, groupSlug: body.groupSlug ?? null });
  if (sel.questions.length < BATTLE_QUESTION_COUNT) {
    return NextResponse.json(
      { error: 'Not enough questions for a battle', available: sel.questions.length },
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
