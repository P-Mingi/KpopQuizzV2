import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { checkLikeBody } from '@/lib/ux-v1/p4/comments';
import { commentStoreLiveNow, isMissingObject, likeCount } from '@/lib/ux-v1/p4/comments-server';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p4/comments/like { target: 'comment' | 'reply', id, action: 'like' | 'unlike' }
// A heart on a quiz comment or on a reply (X1-002; DESIGN-SPEC 17.7: heart + count, pink
// when liked). NEW behaviour on NEW tables (docs/pending-migrations/v11-p4-comment-likes.sql):
// until they exist this answers 503 not_live BEFORE any write. One heart per fan per
// target (primary key); `action` makes a repeat harmless (like twice = one heart). The
// row is the session fan's own (RLS insert / delete: auth.uid() = user_id). No XP, no
// notification. Returns { liked, count }. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const c = checkLikeBody(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
  const { target, id, action } = c.value;

  try {
    if (!(await commentStoreLiveNow())) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const db = await createServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  // the comment or reply must exist (both are public rows)
  const { data: found, error: findError } = await db
    .from(target === 'comment' ? 'quiz_comments' : 'quiz_comment_replies')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: 'failed' }, { status: 500 });
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const table = target === 'comment' ? 'quiz_comment_likes' : 'quiz_comment_reply_likes';
  const col = target === 'comment' ? 'comment_id' : 'reply_id';
  if (action === 'like') {
    const { error } = await db.from(table).insert({ [col]: id, user_id: user.id });
    // 23505: already liked (primary key), which is what the fan asked for
    if (error && error.code !== '23505') {
      if (isMissingObject(error)) return NextResponse.json({ error: 'not_live' }, { status: 503 });
      console.error('[ux-v1/p4/comments/like] insert failed:', error.message);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
  } else {
    const { error } = await db.from(table).delete().eq(col, id).eq('user_id', user.id);
    if (error) {
      console.error('[ux-v1/p4/comments/like] delete failed:', error.message);
      return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
  }

  let count = 0;
  try { count = await likeCount(db, target, id); } catch { /* the heart is saved; the count comes with the next read */ }
  return NextResponse.json({ liked: action === 'like', count });
}
