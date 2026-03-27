import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const action = input.action as string;

  if (action === 'like') {
    const { error } = await supabase
      .from('game_likes')
      .insert({ game_id: id, user_id: user.id });

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
    }

    if (!error) {
      await supabase
        .from('games')
        .update({ like_count: (await supabase.from('game_likes').select('game_id', { count: 'exact', head: true }).eq('game_id', id)).count ?? 0 })
        .eq('id', id);

      // Award XP to creator
      const { data: game } = await supabase.from('games').select('creator_id').eq('id', id).single();
      if (game && game.creator_id !== user.id) {
        try {
          await supabase.rpc('award_xp', { p_user_id: game.creator_id, p_amount: 2, p_reason: 'like_received' });
        } catch { /* non-critical */ }
      }
    }
  } else if (action === 'unlike') {
    await supabase
      .from('game_likes')
      .delete()
      .eq('game_id', id)
      .eq('user_id', user.id);

    await supabase
      .from('games')
      .update({ like_count: (await supabase.from('game_likes').select('game_id', { count: 'exact', head: true }).eq('game_id', id)).count ?? 0 })
      .eq('id', id);
  }

  const { count } = await supabase
    .from('game_likes')
    .select('game_id', { count: 'exact', head: true })
    .eq('game_id', id);

  const { data: userLike } = await supabase
    .from('game_likes')
    .select('game_id')
    .eq('game_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ liked: !!userLike, like_count: count ?? 0 });
}
