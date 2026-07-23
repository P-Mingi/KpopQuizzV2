import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

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

  // XP handed to the liker on this click (0 when unliking, anon, a repeat, a
  // self-like, or before migration 115 lands). The client uses it to float "+X".
  let xpGained = 0;

  try {
    if (action === 'like') {
      if (user) {
        // Authenticated: record in likes table and bump the count.
        await supabase.from('likes').upsert(
          { user_id: user.id, quiz_id: id },
          { onConflict: 'user_id,quiz_id', ignoreDuplicates: true },
        );

        await supabase.rpc('increment_like_count', { quiz_uuid: id });

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
        // Anonymous: just bump the count
        await supabase.rpc('increment_like_count', { quiz_uuid: id });
      }
    } else {
      if (user) {
        // Authenticated: remove DB entry then decrement
        await supabase.from('likes').delete().match({ user_id: user.id, quiz_id: id });
        await supabase.rpc('decrement_like_count', { quiz_uuid: id });
      } else {
        // Anonymous: just lower the count
        await supabase.rpc('decrement_like_count', { quiz_uuid: id });
      }
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
