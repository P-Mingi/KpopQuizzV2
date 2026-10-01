import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { checkReplyBody, REPLY_RATE } from '@/lib/ux-v1/p4/comments';
import { commentStoreLiveNow, hydrateReplies, isMissingObject, REPLY_COLUMNS } from '@/lib/ux-v1/p4/comments-server';

import type { ReplyDbRow } from '@/lib/ux-v1/p4/comments-server';
import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p4/comments/reply { commentId, content } - a reply to a quiz comment,
// one level of nesting (X1-002; prototype #end comment rows: Reply). NEW table
// quiz_comment_replies (docs/pending-migrations/v11-p4-comment-likes.sql): until it
// exists this answers 503 not_live BEFORE any write.
// Same rules as a quiz comment (POST /api/quiz/[id]/comment): signed in, 1..200
// characters, the replier's best score on the quiz attached (score-anchor M1.20). The
// quiz comes from the parent comment, never from the client; the name and flair come
// from profiles at read time (no name column to spoof). A rate cap of 5 per minute.
// The table has no INSERT policy, so this route (service role, after these checks) is
// the only writer. No XP, no notification. Returns { reply }. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const c = checkReplyBody(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
  const { commentId, content } = c.value;

  try {
    if (!(await commentStoreLiveNow())) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  // the parent: a top-level quiz comment (replies nest one level)
  const { data: parent, error: parentError } = await auth.from('quiz_comments').select('id, quiz_id').eq('id', commentId).maybeSingle();
  if (parentError) return NextResponse.json({ error: 'failed' }, { status: 500 });
  if (!parent) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const quizId = (parent as { quiz_id: string }).quiz_id;

  const svc = createServiceRoleClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: recent, error: rateError } = await svc
    .from('quiz_comment_replies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  if (rateError) return NextResponse.json({ error: 'failed' }, { status: 500 });
  if ((recent ?? 0) >= REPLY_RATE) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { data: best } = await auth
    .from('plays')
    .select('score, total_questions')
    .eq('quiz_id', quizId)
    .eq('player_id', user.id)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error: insertError } = await svc
    .from('quiz_comment_replies')
    .insert({
      comment_id: commentId,
      quiz_id: quizId,
      user_id: user.id,
      content,
      score: (best?.score as number | undefined) ?? null,
      total: (best?.total_questions as number | undefined) ?? null,
    })
    .select(REPLY_COLUMNS)
    .single();
  if (insertError || !row) {
    if (isMissingObject(insertError)) return NextResponse.json({ error: 'not_live' }, { status: 503 });
    console.error('[ux-v1/p4/comments/reply] insert failed:', insertError?.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const [reply] = await hydrateReplies(auth, [row as ReplyDbRow]);
  return NextResponse.json({ reply });
}
