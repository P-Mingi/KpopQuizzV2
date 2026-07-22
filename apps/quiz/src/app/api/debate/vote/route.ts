import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// POST /api/debate/vote  { side: 'a'|'b', comment?: string }
// One vote per user per day, enforced DB-side by cast_debate_vote (unique row +
// ON CONFLICT DO NOTHING). Returns the live { a, b } split. No streak, no XP:
// the debate is expression, not grind.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { side, comment } = (body ?? {}) as { side?: unknown; comment?: unknown };
  if (side !== 'a' && side !== 'b') {
    return NextResponse.json({ error: 'bad_side' }, { status: 400 });
  }
  const commentText = typeof comment === 'string' ? comment.trim() : null;
  if (commentText && commentText.length > 280) {
    return NextResponse.json({ error: 'comment_too_long' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  // The RPC does the auth.uid() check, the one-per-day insert, the split, and
  // the activity event. It is granted to authenticated only.
  const { data, error } = await supabase.rpc('cast_debate_vote', {
    p_side: side,
    p_comment: commentText,
  });
  if (error) {
    console.error('[debate/vote]', error.message);
    return NextResponse.json({ error: 'vote_failed' }, { status: 500 });
  }
  return NextResponse.json(data);
}
