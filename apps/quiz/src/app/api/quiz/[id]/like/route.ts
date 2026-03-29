import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

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

  try {
    if (action === 'like') {
      if (user) {
        // Authenticated: record in likes table and award XP to creator
        await supabase.from('likes').upsert(
          { user_id: user.id, quiz_id: id },
          { onConflict: 'user_id,quiz_id', ignoreDuplicates: true },
        );

        await supabase.rpc('increment_like_count', { quiz_uuid: id });

        const { data: quiz } = await supabase
          .from('quizzes')
          .select('creator_id')
          .eq('id', id)
          .single();

        if (quiz && quiz.creator_id !== user.id) {
          await supabase.rpc('award_xp', {
            p_user_id: quiz.creator_id,
            p_amount: 2,
            p_reason: 'like_received',
          });
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
    });
  } catch (err) {
    console.error('Failed to toggle like:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
