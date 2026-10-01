import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { createPublicReadClient } from '@/lib/supabase/server';
import { isExpired, UUID_RE } from '@/lib/ux-v1/p4/challenge';
import { verifyChallenge } from '@/lib/ux-v1/p4/challenge-server';
import { maxScoreFor } from '@/lib/ux-v1/p4/engine';

import type { NextRequest } from 'next/server';
import type { QuizType } from '@/lib/db/types';
import type { ChallengePublic } from '@/lib/ux-v1/p4/challenge';
import type { QuestionData } from '@/lib/ux-v1/p4/engine';

// GET /api/ux-v1/p4/challenge/<id>?s=<sig> - read only. The challenge a link points
// at: the challenger's public name (profiles.username; never an id), the score to
// beat and the exact questions to play. A row without a valid signature is not a
// challenge (see lib/ux-v1/p4/challenge-server.ts). Expired (48 h) challenges come
// back with expired: true and no questions. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { id } = await params;
  const sig = req.nextUrl.searchParams.get('s');
  if (!UUID_RE.test(id) || !verifyChallenge(id, sig)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const db = createPublicReadClient();
  const { data: row } = await db
    .from('battles')
    .select('id, quiz_id, questions, challenger_hash, challenger_score, created_at')
    .eq('id', id)
    .maybeSingle();
  const b = row as { id: string; quiz_id: string | null; questions: QuestionData[] | null; challenger_hash: string; challenger_score: number | null; created_at: string } | null;
  if (!b || !b.quiz_id || !Array.isArray(b.questions) || b.questions.length === 0 || b.challenger_score === null) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: quiz } = await db.from('quizzes').select('quiz_type').eq('id', b.quiz_id).maybeSingle();
  const quizType = ((quiz?.quiz_type as QuizType | undefined) ?? 'multiple_choice');

  let challenger: ChallengePublic['challenger'] = null;
  if (b.challenger_hash.startsWith('user:')) {
    const uid = b.challenger_hash.slice(5);
    if (UUID_RE.test(uid)) {
      const { data: p } = await db.from('profiles').select('username, name_accent, name_font').eq('id', uid).maybeSingle();
      if (p?.username) challenger = { name: p.username as string, accent: (p.name_accent as string | null) ?? null, font: (p.name_font as string | null) ?? null };
    }
  }

  const expired = isExpired(b.created_at);
  const body: ChallengePublic = {
    id: b.id,
    quizId: b.quiz_id,
    challenger,
    score: b.challenger_score,
    total: b.questions.length,
    maxScore: maxScoreFor(quizType, b.questions.length),
    questions: expired ? [] : b.questions,
    createdAt: b.created_at,
    expired,
  };
  return NextResponse.json(body, { headers: { 'cache-control': 'no-store' } });
}
