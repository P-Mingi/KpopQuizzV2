import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

interface AnswerBody {
  partyPlayerId: string;
  round: number;
  answer: string;
  correct: boolean;
  timeMs: number;
  points: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;

  let body: AnswerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Verify room exists and is playing
  const { data: room } = await adminDb
    .from('party_rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (!room || room.status !== 'playing') {
    return NextResponse.json({ error: 'Room not found or not playing' }, { status: 400 });
  }

  // Update player's score and answers
  const { data: pp } = await adminDb
    .from('party_players')
    .select('id, score, correct_count, current_combo, best_combo, answers')
    .eq('id', body.partyPlayerId)
    .single();

  if (!pp) {
    return NextResponse.json({ error: 'Player not found in room' }, { status: 404 });
  }

  const newCombo = body.correct ? (pp.current_combo ?? 0) + 1 : 0;
  const newBestCombo = Math.max(pp.best_combo ?? 0, newCombo);
  const existingAnswers = (pp.answers as unknown[]) ?? [];

  await adminDb
    .from('party_players')
    .update({
      score: (pp.score ?? 0) + body.points,
      correct_count: (pp.correct_count ?? 0) + (body.correct ? 1 : 0),
      current_combo: newCombo,
      best_combo: newBestCombo,
      answers: [...existingAnswers, {
        round: body.round,
        answer: body.answer,
        correct: body.correct,
        time_ms: body.timeMs,
      }],
    })
    .eq('id', body.partyPlayerId);

  return NextResponse.json({ ok: true });
}
