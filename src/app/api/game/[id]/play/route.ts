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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  if (typeof input.choices !== 'object' || input.choices === null) {
    return NextResponse.json({ error: 'Choices are required' }, { status: 400 });
  }

  // Check for duplicate play by logged-in user
  if (user) {
    const { data: existingPlay } = await supabase
      .from('game_plays')
      .select('id, choices')
      .eq('game_id', id)
      .eq('player_id', user.id)
      .maybeSingle();

    if (existingPlay) {
      // Return existing choices + current vote totals
      const { data: game } = await supabase
        .from('games')
        .select('content, play_count')
        .eq('id', id)
        .single();

      return NextResponse.json({
        already_played: true,
        choices: existingPlay.choices,
        content: game?.content,
        play_count: game?.play_count ?? 0,
      });
    }
  }

  // Record the play atomically
  const { data: playId, error } = await supabase.rpc('record_game_play', {
    p_game_id: id,
    p_player_id: user?.id ?? null,
    p_choices: input.choices,
  });

  if (error) {
    console.error('Failed to record game play:', error);
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
  }

  // Award XP to player
  if (user) {
    try {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: 5,
        p_reason: 'play',
      });
    } catch (err) {
      console.error('Failed to award XP:', err);
    }
  }

  // Fetch updated game data for results
  const { data: game } = await supabase
    .from('games')
    .select('content, play_count')
    .eq('id', id)
    .single();

  return NextResponse.json({
    play_id: playId,
    content: game?.content,
    play_count: game?.play_count ?? 0,
    xp_earned: user ? 5 : 0,
  });
}
