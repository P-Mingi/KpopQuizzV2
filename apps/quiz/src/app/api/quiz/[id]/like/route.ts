import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { teamRefusal } from '@/lib/editorial/team-refusal';

import type { NextRequest } from 'next/server';

/**
 * GET /api/quiz/[id]/like
 * Returns the caller's true like state + the live count. The quiz page is ISR
 * (revalidate 3600), so the count baked into the static HTML goes stale the
 * moment anyone likes; the button calls this on mount to reconcile with the DB
 * instead of showing the frozen build-time number. `liked` reflects the signed
 * in user's row in `likes` (anonymous callers reconcile from localStorage).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('like_count')
    .eq('id', id)
    .maybeSingle();

  const { data: { user } } = await supabase.auth.getUser();
  let liked = false;
  if (user) {
    const { data: row } = await supabase
      .from('likes')
      .select('quiz_id')
      .match({ user_id: user.id, quiz_id: id })
      .maybeSingle();
    liked = !!row;
  }

  return NextResponse.json({ liked, like_count: quiz?.like_count ?? 0 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createServerClient();

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { action } = body as Record<string, unknown>;

  if (action !== 'like' && action !== 'unlike') {
    return NextResponse.json({ error: 'action must be "like" or "unlike"' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const teamNo = await teamRefusal(user?.id);
  if (teamNo) return teamNo;

  // XP handed to the liker on this click (0 when unliking, anon, a repeat, a
  // self-like, or before migration 115 lands). The client uses it to float "+X".
  let xpGained = 0;

  // L33 (security audit): one like per user. The count is moved by a trigger on public.likes (one row per user and quiz), so this route
  // only writes that row; increment_like_count and decrement_like_count are closed. A visitor with no account has no like to record.
  if (!user) {
    return NextResponse.json({ error: 'Sign in to like a quiz' }, { status: 401 });
  }

  try {
    if (action === 'like') {
      // The upsert ignores a repeat: the unique key keeps one row, so the trigger counts one like.
      await supabase.from('likes').upsert(
        { user_id: user.id, quiz_id: id },
        { onConflict: 'user_id,quiz_id', ignoreDuplicates: true },
      );

      // Award like XP once per (liker, quiz) ever, self-likes excluded (the
      // guard lives in award_like_xp). award_xp is revoked from authenticated,
      // so this runs through the service role. Non-critical + best-effort: if
      // migration 115 is not applied yet, we swallow the error and award 0.
      try {
        const admin = createServiceRoleClient();
        const { data: xpRes } = await admin.rpc('award_like_xp', { p_quiz_id: id, p_liker_id: user.id });
        xpGained = (xpRes as { liker?: number } | null)?.liker ?? 0;
      } catch (xpErr) {
        console.warn('[like] award_like_xp skipped:', (xpErr as Error)?.message ?? xpErr);
      }
    } else {
      await supabase.from('likes').delete().match({ user_id: user.id, quiz_id: id });
    }

    const { data: updated } = await supabase
      .from('quizzes')
      .select('like_count')
      .eq('id', id)
      .single();

    return NextResponse.json({
      liked: action === 'like',
      like_count: updated?.like_count ?? 0,
      xp_gained: xpGained,
    });
  } catch (err) {
    console.error('Failed to toggle like:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
