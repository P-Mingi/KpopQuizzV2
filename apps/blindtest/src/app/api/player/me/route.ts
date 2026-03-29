import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const { data: masteries } = await supabase
    .from('player_group_mastery')
    .select('*, groups!inner(name, slug, display_color)')
    .eq('player_id', user.id)
    .order('mastery_xp', { ascending: false });

  const { data: achievements } = await supabase
    .from('player_achievements')
    .select('achievement_id, earned_at')
    .eq('player_id', user.id);

  const { data: recentPlays } = await supabase
    .from('bt_plays')
    .select('mode_id, score, correct, total, created_at')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    player,
    masteries: masteries ?? [],
    achievements: achievements ?? [],
    recent_plays: recentPlays ?? [],
  });
}
