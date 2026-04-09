import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { calculateGameXP, getLevelFromXP, calculateStreak } from '@/lib/progression';

interface DailyRecordBody {
  challenge_id: string;
  score: number;
  correct: number;
  total: number;
  total_time: number;
  best_combo: number;
  // songs is an array of per-song results the client computed.
  songs?: Array<{
    song_id: string;
    correct: boolean;
    points: number;
    time: number;
    answered: string | null;
  }>;
}

export async function POST(req: Request) {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
  }

  let body: DailyRecordBody;
  try {
    body = (await req.json()) as DailyRecordBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Verify one-play-per-day (also enforced by UNIQUE(player_id, challenge_id)).
  const { data: existing } = await supabase
    .from('daily_challenge_plays')
    .select('id')
    .eq('player_id', user.id)
    .eq('challenge_id', body.challenge_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already played today', played: true }, { status: 400 });
  }

  // Record the daily play (legacy table, keyed on auth user id).
  const { error: insertError } = await supabase
    .from('daily_challenge_plays')
    .insert({
      player_id: user.id,
      challenge_id: body.challenge_id,
      score: body.score,
      correct: body.correct,
      total_time: body.total_time,
      best_combo: body.best_combo,
      songs: body.songs ?? [],
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update bt_players (the canonical player table) for XP/streak/progression,
  // same shape as /api/game/save-result so the profile picks it up.
  let progression: Record<string, unknown> = {};
  try {
    const { data: btPlayer } = await supabase
      .from('bt_players')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (btPlayer) {
      const { newStreak, isFirstGameToday } = calculateStreak(
        btPlayer.last_played_date as string | null,
        btPlayer.current_streak as number,
      );
      const isPerfect = body.correct === body.total;
      const xpEarned = calculateGameXP({
        score: body.score,
        correctCount: body.correct,
        totalSongs: body.total,
        mode: 'daily',
        isFirstGameToday,
        isPerfectRound: isPerfect,
        currentStreak: newStreak,
      });

      const newTotalXP = (btPlayer.total_xp as number) + xpEarned;
      const oldLevel = btPlayer.level as number;
      const { level: newLevel, title: newTitle } = getLevelFromXP(newTotalXP);
      const leveledUp = newLevel > oldLevel;

      // Save as a regular bt_game_result so the profile "recent games" list
      // picks it up.
      await supabase.from('bt_game_results').insert({
        player_id: btPlayer.id,
        mode: 'daily',
        playlist: 'all',
        difficulty: 'all',
        score: body.score,
        correct_count: body.correct,
        total_songs: body.total,
        best_combo: body.best_combo,
        avg_speed: body.total > 0 && body.correct > 0 ? body.total_time / body.correct : null,
        xp_earned: xpEarned,
        song_results: body.songs ?? null,
      });

      // Update bt_players aggregates.
      const today = new Date().toISOString().split('T')[0]!;
      await supabase
        .from('bt_players')
        .update({
          level: newLevel,
          total_xp: newTotalXP,
          total_games: (btPlayer.total_games as number) + 1,
          total_correct: (btPlayer.total_correct as number) + body.correct,
          total_songs_played: (btPlayer.total_songs_played as number) + body.total,
          best_score: Math.max(btPlayer.best_score as number, body.score),
          best_combo: Math.max(btPlayer.best_combo as number, body.best_combo),
          current_streak: newStreak,
          longest_streak: Math.max(btPlayer.longest_streak as number, newStreak),
          last_played_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', btPlayer.id);

      progression = {
        xpEarned,
        totalXP: newTotalXP,
        level: newLevel,
        title: newTitle,
        leveledUp,
        oldLevel,
        streak: newStreak,
        isFirstGameToday,
        isPerfectRound: isPerfect,
        mastery: null,
      };
    }
  } catch {
    // Non-blocking: saving the daily attempt is the important part.
  }

  // Rank on today's leaderboard.
  const { data: allPlays } = await supabase
    .from('daily_challenge_plays')
    .select('player_id, score')
    .eq('challenge_id', body.challenge_id)
    .order('score', { ascending: false });

  const rank = (allPlays ?? []).findIndex((p: { player_id: string }) => p.player_id === user.id) + 1;

  return NextResponse.json({
    success: true,
    saved: true,
    rank,
    total_players: allPlays?.length ?? 0,
    ...progression,
  });
}
