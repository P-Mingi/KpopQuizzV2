import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createServerClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  try {
    if (action === 'like') {
      // Insert like (ignore duplicate)
      await supabase.from('likes').upsert(
        { user_id: user.id, quiz_id: id },
        { onConflict: 'user_id,quiz_id', ignoreDuplicates: true },
      );

      // Increment cached counts
      await supabase.rpc('increment_like_count', { quiz_uuid: id });

      // Award 2 XP to quiz creator
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
      // Delete like
      await supabase.from('likes').delete().match({ user_id: user.id, quiz_id: id });

      // Decrement cached counts
      await supabase.rpc('decrement_like_count', { quiz_uuid: id });
    }

    // Get updated count
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
