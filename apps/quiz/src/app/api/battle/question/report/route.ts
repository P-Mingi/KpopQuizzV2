import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

// E8 - POST /api/battle/question/report { battleId, questionIndex, reason? }
// Records a per-question report into the existing `reports` table. Dedup: a
// given reporter (signed-in id OR anon ip+day hash) can report the same
// question once. At >= 3 distinct reporters for a question, if the question
// belongs to a quiz, flip that quiz's status to 'flagged' so the admin sees it
// in the existing reports queue.
export const dynamic = 'force-dynamic';

const VALID_REASONS = new Set(['wrong_answers', 'inappropriate', 'spam', 'duplicate', 'other']);
const STRIKE_THRESHOLD = 3;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { battleId?: unknown; questionIndex?: unknown; reason?: unknown };
  try { body = (await req.json()) as typeof body; } catch { body = {}; }
  const battleId = typeof body.battleId === 'string' ? body.battleId : '';
  const questionIndex = typeof body.questionIndex === 'number' ? body.questionIndex : -1;
  const reason = typeof body.reason === 'string' && VALID_REASONS.has(body.reason) ? body.reason : 'inappropriate';
  if (!battleId || questionIndex < 0) {
    return NextResponse.json({ error: 'battleId + questionIndex required' }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  const { data: battle } = await svc
    .from('battles')
    .select('id, quiz_id, questions')
    .eq('id', battleId)
    .maybeSingle();
  if (!battle || !Array.isArray(battle.questions) || !battle.questions[questionIndex]) {
    return NextResponse.json({ error: 'Battle or question not found' }, { status: 404 });
  }
  const questionText = ((battle.questions[questionIndex] as { question?: string }).question ?? '').slice(0, 500);
  if (!questionText) return NextResponse.json({ error: 'Empty question' }, { status: 400 });

  // Identify reporter (authed id OR anon ip+day hash). The unique index dedups
  // duplicate reports from the same user/anon on the same question.
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const reporterHash = user ? null : anonHash(req);

  const { error: insErr } = await svc.from('reports').insert({
    quiz_id: (battle.quiz_id as string | null) ?? null,
    reporter_id: user?.id ?? null,
    reporter_hash: reporterHash,
    reason,
    details: '[Battle question] ' + questionText.slice(0, 350),
    question_text: questionText,
  });
  // Unique-violation -> the reporter already reported this question. Treat as
  // a no-op success so we don't reveal who reported, but flag already_reported.
  if (insErr) {
    const dup = /duplicate key value|unique constraint/i.test(insErr.message);
    if (!dup) {
      console.error('Failed to insert question report:', insErr.message);
      return NextResponse.json({ error: 'Could not record report' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, already_reported: true, pulled_for_review: false });
  }

  // Strike-3 pull-to-review (only when the question belongs to a quiz - group
  // battle questions still record the reports for admin to see).
  let pulledForReview = false;
  if (battle.quiz_id) {
    const { count } = await svc
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', battle.quiz_id)
      .eq('question_text', questionText);
    if ((count ?? 0) >= STRIKE_THRESHOLD) {
      const { error: upErr } = await svc
        .from('quizzes')
        .update({ status: 'flagged', updated_at: new Date().toISOString() })
        .eq('id', battle.quiz_id)
        .neq('status', 'removed');
      if (!upErr) pulledForReview = true;
    }
  }

  return NextResponse.json({ ok: true, pulled_for_review: pulledForReview });
}
