import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { isUuid } from '@/lib/anon-claim';
import { createPublicReadClient, createServerClient } from '@/lib/supabase/server';
import { challengeHref, orderStoredQuestions } from '@/lib/ux-v1/p4/challenge';
import { guestHash, signChallenge, underLimit } from '@/lib/ux-v1/p4/challenge-server';
import { maxScoreFor } from '@/lib/ux-v1/p4/engine';

import type { NextRequest } from 'next/server';
import type { QuizType } from '@/lib/db/types';
import type { QuestionData } from '@/lib/ux-v1/p4/engine';

// POST /api/ux-v1/p4/challenge - "Challenge a friend" (DESIGN-SPEC 16.7, WIRING-MAP
// v10 "Challenge chip"). Creates one row in the EXISTING `battles` table (migration 073
// + the 074 questions snapshot): quiz_id, the questions in the order the challenger
// played them, challenger_score, challenger_hash. No DDL.
//
// Body: { quizId, questions: string[] (question texts in played order), score }.
// The snapshot is rebuilt from the quiz's STORED questions (a client cannot plant
// answers); the score is checked against the quiz's max. Returns the signed link
// /q/<slug>?c=<id>.<sig>. Identity: `user:<session id>` or the guest hash (ip + day).
// New behaviour, new endpoint: nothing existing is written or changed. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: { quizId?: unknown; questions?: unknown; score?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const { quizId, questions, score } = body;
  if (!isUuid(quizId) || !Array.isArray(questions) || typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const who = user ? `user:${user.id}` : guestHash(req);
  if (!underLimit(`c:${who}`)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const pub = createPublicReadClient();
  const { data: quiz } = await pub
    .from('quizzes')
    .select('id, slug, quiz_type, questions, status, groups!inner(slug)')
    .eq('id', quizId)
    .eq('status', 'published')
    .maybeSingle();
  if (!quiz) return NextResponse.json({ error: 'quiz_not_found' }, { status: 404 });

  const q = quiz as unknown as { id: string; slug: string; quiz_type: QuizType; questions: QuestionData[]; groups: { slug: string } };
  const snapshot = orderStoredQuestions(q.questions ?? [], questions as string[]);
  if (!snapshot) return NextResponse.json({ error: 'questions_mismatch' }, { status: 400 });
  if (score > maxScoreFor(q.quiz_type, snapshot.length)) return NextResponse.json({ error: 'invalid_score' }, { status: 400 });

  const { data: row, error } = await auth
    .from('battles')
    .insert({
      quiz_id: q.id,
      group_slug: q.groups.slug,
      question_ids: [],
      questions: snapshot,
      challenger_hash: who,
      challenger_score: score,
    })
    .select('id')
    .single();
  if (error || !row) {
    console.error('[ux-v1/p4/challenge] insert failed:', error?.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const id = row.id as string;
  const sig = signChallenge(id);
  if (!sig) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
  return NextResponse.json({ id, url: `${origin}${challengeHref(q.slug, id, sig)}` });
}
