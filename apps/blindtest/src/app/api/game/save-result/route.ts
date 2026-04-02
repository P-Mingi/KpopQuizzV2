import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { calculateGameXP, getLevelFromXP, calculateMasteryStars, calculateStreak } from '@/lib/progression';

interface SaveBody {
  mode: string;
  playlist: string;
  difficulty: string;
  score: number;
  correctCount: number;
  totalSongs: number;
  bestCombo: number;
  avgSpeed: number;
  songResults?: unknown[];
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Get or create player
  let { data: player } = await adminDb
    .from('bt_players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    const { data: newPlayer, error } = await adminDb
      .from('bt_players')
      .insert({
        user_id: user.id,
        display_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Player',
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    player = newPlayer;
  }

  if (!player) return NextResponse.json({ error: 'Failed to get player' }, { status: 500 });

  // Calculate streak
  const { newStreak, isFirstGameToday } = calculateStreak(
    player.last_played_date as string | null,
    player.current_streak as number,
  );

  // Calculate XP
  const isPerfectRound = body.correctCount === body.totalSongs;
  const xpEarned = calculateGameXP({
    score: body.score,
    correctCount: body.correctCount,
    totalSongs: body.totalSongs,
    mode: body.mode,
    isFirstGameToday,
    isPerfectRound,
    currentStreak: newStreak,
  });

  const newTotalXP = (player.total_xp as number) + xpEarned;
  const oldLevel = player.level as number;
  const { level: newLevel, title: newTitle } = getLevelFromXP(newTotalXP);
  const leveledUp = newLevel > oldLevel;

  // Save game result
  const { error: resultError } = await adminDb
    .from('bt_game_results')
    .insert({
      player_id: player.id,
      mode: body.mode,
      playlist: body.playlist,
      difficulty: body.difficulty || 'all',
      score: body.score,
      correct_count: body.correctCount,
      total_songs: body.totalSongs,
      best_combo: body.bestCombo,
      avg_speed: body.avgSpeed,
      xp_earned: xpEarned,
      song_results: body.songResults ?? null,
    });

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 });

  // Update player
  const today = new Date().toISOString().split('T')[0]!;
  await adminDb
    .from('bt_players')
    .update({
      level: newLevel,
      total_xp: newTotalXP,
      total_games: (player.total_games as number) + 1,
      total_correct: (player.total_correct as number) + body.correctCount,
      total_songs_played: (player.total_songs_played as number) + body.totalSongs,
      best_score: Math.max(player.best_score as number, body.score),
      best_combo: Math.max(player.best_combo as number, body.bestCombo),
      current_streak: newStreak,
      longest_streak: Math.max(player.longest_streak as number, newStreak),
      last_played_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', player.id);

  // Update playlist mastery
  const { data: existingMastery } = await adminDb
    .from('bt_playlist_mastery')
    .select('*')
    .eq('player_id', player.id)
    .eq('playlist', body.playlist)
    .single();

  let masteryResult: { play_count: number; best_score: number; mastery_stars: number } | null = null;

  if (existingMastery) {
    const newPlayCount = (existingMastery.play_count as number) + 1;
    const newBestScore = Math.max(existingMastery.best_score as number, body.score);
    const newStars = calculateMasteryStars(newPlayCount, newBestScore);

    await adminDb
      .from('bt_playlist_mastery')
      .update({
        play_count: newPlayCount,
        best_score: newBestScore,
        total_correct: (existingMastery.total_correct as number) + body.correctCount,
        total_songs_played: (existingMastery.total_songs_played as number) + body.totalSongs,
        mastery_stars: newStars,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingMastery.id);

    masteryResult = { play_count: newPlayCount, best_score: newBestScore, mastery_stars: newStars };
  } else {
    const newStars = calculateMasteryStars(1, body.score);
    await adminDb
      .from('bt_playlist_mastery')
      .insert({
        player_id: player.id,
        playlist: body.playlist,
        play_count: 1,
        best_score: body.score,
        total_correct: body.correctCount,
        total_songs_played: body.totalSongs,
        mastery_stars: newStars,
      });

    masteryResult = { play_count: 1, best_score: body.score, mastery_stars: newStars };
  }

  return NextResponse.json({
    saved: true,
    xpEarned,
    totalXP: newTotalXP,
    level: newLevel,
    title: newTitle,
    leveledUp,
    oldLevel,
    streak: newStreak,
    isFirstGameToday,
    isPerfectRound,
    mastery: masteryResult,
  });
}
