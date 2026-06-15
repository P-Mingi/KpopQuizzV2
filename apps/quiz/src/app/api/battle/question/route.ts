import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

// E4 - the post-battle fan-pride hook: submit a question into pending_questions
// (status 'pending'). Anon-first (author_hash = sha256(ip+day)). Confirm/flag
// promotion to 'live' is E6; here we just record the submission.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { quizId?: string; groupSlug?: string; question?: unknown; options?: unknown; correct_index?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const options = Array.isArray(body.options) ? body.options.map((o) => (typeof o === 'string' ? o.trim() : '')) : [];
  const correctIndex = body.correct_index;

  if (
    question.length === 0 || question.length > 200 ||
    options.length !== 4 || options.some((o) => o.length === 0 || o.length > 120) ||
    typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex > 3
  ) {
    return NextResponse.json({ error: 'A question, 4 answers, and a correct answer are required' }, { status: 400 });
  }

  // Capture the signed-in author (if any) so we can award +20 XP on promotion.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('pending_questions').insert({
    quiz_id: typeof body.quizId === 'string' ? body.quizId : null,
    group_slug: typeof body.groupSlug === 'string' ? body.groupSlug : null,
    question,
    options,
    correct_index: correctIndex,
    author_hash: anonHash(req),
    author_user_id: user?.id ?? null,
  });

  if (error) {
    console.error('Failed to submit battle question:', error.message);
    return NextResponse.json({ error: 'Could not submit question' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
