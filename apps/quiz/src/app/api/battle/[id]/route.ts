import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// E5 - load a battle so a challenged FRIEND can play the challenger's exact 7
// questions and see the real head-to-head (not a random ghost). Returns the
// snapshot questions + the challenger's finished run (score + per_question).
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, quiz_id, group_slug, questions, challenger_hash, challenger_score')
    .eq('id', id)
    .maybeSingle();

  if (!battle || !battle.questions) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  // The challenger's originating run (for the real head-to-head). Null if they
  // somehow have not finished yet - the client then falls back to a ghost.
  let challenger: { score: number; per_question: boolean[]; handle: string } | null = null;
  if (battle.challenger_score !== null) {
    const { data: cr } = await supabase
      .from('battle_results')
      .select('score, per_question')
      .eq('battle_id', id)
      .eq('player_hash', battle.challenger_hash)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    challenger = {
      score: battle.challenger_score as number,
      per_question: (cr?.per_question as boolean[]) ?? [],
      handle: `@fan_${(battle.challenger_hash as string).slice(-4)}`,
    };
  }

  return NextResponse.json({
    battleId: battle.id,
    questions: battle.questions,
    challenger,
    quizId: battle.quiz_id,
    groupSlug: battle.group_slug,
  });
}
