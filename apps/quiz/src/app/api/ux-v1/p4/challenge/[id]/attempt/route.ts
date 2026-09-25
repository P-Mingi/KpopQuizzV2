import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { isUuid, readAnonCookie } from '@/lib/anon-claim';
import { createPublicReadClient, createServerClient } from '@/lib/supabase/server';
import { isExpired, UUID_RE } from '@/lib/ux-v1/p4/challenge';
import { guestHash, underLimit, verifyChallenge } from '@/lib/ux-v1/p4/challenge-server';
import { maxScoreFor } from '@/lib/ux-v1/p4/engine';

import type { NextRequest } from 'next/server';
import type { QuizType } from '@/lib/db/types';

// POST /api/ux-v1/p4/challenge/<id>/attempt { sig, score, perQuestion, timeMs }
// Records one challenge run in the EXISTING `battle_results` table (073, with the
// user_id / anon_id columns of 155 so a guest can put their name on it later through
// the unchanged /api/claim-runs). Answers { won } (ties go to the player, as the
// prototype). The run itself is saved separately, exactly like any run, through the
// existing POST /api/quiz/[id]/play. New behaviour, new endpoint. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { id } = await params;

  let body: { sig?: unknown; score?: unknown; perQuestion?: unknown; timeMs?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!UUID_RE.test(id) || typeof body.sig !== 'string' || !verifyChallenge(id, body.sig)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { score, perQuestion, timeMs } = body;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) return NextResponse.json({ error: 'invalid_score' }, { status: 400 });
  if (!Array.isArray(perQuestion) || !perQuestion.every((v) => typeof v === 'boolean')) return NextResponse.json({ error: 'invalid_answers' }, { status: 400 });
  if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs < 0 || timeMs > 3_600_000) return NextResponse.json({ error: 'invalid_time' }, { status: 400 });

  const pub = createPublicReadClient();
  const { data: row } = await pub.from('battles').select('id, quiz_id, questions, challenger_score, created_at').eq('id', id).maybeSingle();
  const b = row as { id: string; quiz_id: string | null; questions: unknown[] | null; challenger_score: number | null; created_at: string } | null;
  if (!b || !b.quiz_id || !Array.isArray(b.questions) || b.challenger_score === null) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (isExpired(b.created_at)) return NextResponse.json({ error: 'expired' }, { status: 410 });
  if (perQuestion.length !== b.questions.length) return NextResponse.json({ error: 'invalid_answers' }, { status: 400 });

  const { data: quiz } = await pub.from('quizzes').select('quiz_type').eq('id', b.quiz_id).maybeSingle();
  const quizType = ((quiz?.quiz_type as QuizType | undefined) ?? 'multiple_choice');
  if (score > maxScoreFor(quizType, b.questions.length)) return NextResponse.json({ error: 'invalid_score' }, { status: 400 });

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const who = user ? `user:${user.id}` : guestHash(req);
  if (!underLimit(`a:${who}`, 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const proven = user ? null : readAnonCookie(req);

  const { error } = await auth.from('battle_results').insert({
    battle_id: b.id,
    player_hash: who,
    score,
    per_question: perQuestion,
    time_ms: Math.round(timeMs),
    user_id: user?.id ?? null,
    anon_id: proven && isUuid(proven) ? proven : null,
  });
  if (error) {
    console.error('[ux-v1/p4/challenge attempt] insert failed:', error.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json({ won: score >= b.challenger_score });
}
