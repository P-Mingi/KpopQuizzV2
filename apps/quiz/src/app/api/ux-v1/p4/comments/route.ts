import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { isUuid, likeKey, NOT_LIVE, parseIds } from '@/lib/ux-v1/p4/comments';
import { commentStoreLive, likeCounts, readReplies } from '@/lib/ux-v1/p4/comments-server';

import type { P4CommentExtras } from '@/lib/ux-v1/p4/comments';
import type { NextRequest } from 'next/server';

// GET /api/ux-v1/p4/comments?quiz=<uuid>&ids=<uuid,...> - read only (X1-002).
// The hearts and replies of the comments the results list shows (the list itself stays
// on the EXISTING GET /api/quiz/[id]/comment): heart counts (aggregates), the session
// fan's own hearts, and the replies of each comment with the replier's name and flair.
// Until docs/pending-migrations/v11-p4-comment-likes.sql is applied: { live: false }
// and the page shows no heart and no Reply. A failed read is also { live: false }
// (fail closed: never a heart with a wrong count). Flag off: 404.

export const dynamic = 'force-dynamic';

const CHUNK = 100;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const quizId = req.nextUrl.searchParams.get('quiz');
  if (!isUuid(quizId)) return NextResponse.json({ error: 'quiz_required' }, { status: 400 });
  const ids = parseIds(req.nextUrl.searchParams.get('ids'));

  let live = false;
  try { live = await commentStoreLive(); } catch { live = false; }
  if (!live) return NextResponse.json(NOT_LIVE satisfies P4CommentExtras);

  try {
    const db = await createServerClient();
    const replies = await readReplies(db, quizId, ids);
    const replyIds = Object.values(replies).flat().map((r) => r.id);
    const [likes, { data: { user } }] = await Promise.all([likeCounts(db, ids, replyIds), db.auth.getUser()]);

    const liked: string[] = [];
    if (user) {
      // own rows only (RLS: auth.uid() = user_id); reply ids in chunks to keep the URL short
      if (ids.length > 0) {
        const { data } = await db.from('quiz_comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', ids);
        for (const r of (data ?? []) as { comment_id: string }[]) liked.push(likeKey('comment', r.comment_id));
      }
      for (let i = 0; i < replyIds.length; i += CHUNK) {
        const { data } = await db.from('quiz_comment_reply_likes').select('reply_id').eq('user_id', user.id).in('reply_id', replyIds.slice(i, i + CHUNK));
        for (const r of (data ?? []) as { reply_id: string }[]) liked.push(likeKey('reply', r.reply_id));
      }
    }
    return NextResponse.json({ live: true, likes, liked, replies } satisfies P4CommentExtras);
  } catch (e) {
    console.error('[ux-v1/p4/comments] read failed:', e instanceof Error ? e.message : e);
    return NextResponse.json(NOT_LIVE satisfies P4CommentExtras);
  }
}
