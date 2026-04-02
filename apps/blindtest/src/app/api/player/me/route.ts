import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getLevelFromXP } from '@/lib/progression';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ player: null });
  }

  const adminDb = createServiceRoleClient();

  let { data: player } = await adminDb
    .from('bt_players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Auto-create on first visit
  if (!player) {
    const { data: newPlayer } = await adminDb
      .from('bt_players')
      .insert({
        user_id: user.id,
        display_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Player',
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      })
      .select()
      .single();

    if (!newPlayer) return NextResponse.json({ player: null });
    player = newPlayer;
  }

  const levelInfo = getLevelFromXP(player.total_xp as number);
  const totalPlayed = player.total_songs_played as number;
  const totalCorrect = player.total_correct as number;
  const accuracy = totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;

  // Fetch mastery
  const { data: mastery } = await adminDb
    .from('bt_playlist_mastery')
    .select('playlist, play_count, best_score, mastery_stars')
    .eq('player_id', player.id)
    .order('mastery_stars', { ascending: false })
    .limit(10);

  // Fetch recent games
  const { data: recentGames } = await adminDb
    .from('bt_game_results')
    .select('mode, playlist, score, correct_count, total_songs, xp_earned, played_at')
    .eq('player_id', player.id)
    .order('played_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    player: {
      id: player.id,
      display_name: player.display_name,
      avatar_url: player.avatar_url,
      level: levelInfo.level,
      title: levelInfo.title,
      total_xp: player.total_xp,
      nextLevelXP: levelInfo.nextLevelXP,
      progressPercent: levelInfo.progressPercent,
      total_games: player.total_games,
      total_correct: totalCorrect,
      total_songs_played: totalPlayed,
      accuracy,
      best_score: player.best_score,
      best_combo: player.best_combo,
      current_streak: player.current_streak,
      longest_streak: player.longest_streak,
      mastery: mastery ?? [],
      recentGames: recentGames ?? [],
    },
  });
}
