import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { calculateGameXP, getLevelFromXP, calculateStreak } from '@/lib/progression';

interface RankedBody {
  playlist: string;
  score: number;
  correctCount: number;
  totalSongs: number;
  bestCombo: number;
  avgSpeed: number;
  songResults?: { song_id: string; correct: boolean; points: number; time: number }[];
  songIds?: string[];
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Ranked mode requires authentication' }, { status: 401 });
  }

  let body: RankedBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Get player
  const { data: player } = await adminDb
    .from('bt_players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  // Save ranked play record
  await adminDb.from('ranked_plays').insert({
    player_id: player.id,
    score: body.score,
    correct_count: body.correctCount,
    total_rounds: body.totalSongs,
    best_combo: body.bestCombo,
    avg_speed_ms: Math.round(body.avgSpeed * 1000),
    playlist: { type: 'artist', value: body.playlist },
    song_ids: body.songIds ?? [],
  });

  // Calculate XP with ranked bonus (+20%)
  const streak = calculateStreak(player.last_played_date, player.current_streak);
  const baseXP = calculateGameXP({
    score: body.score,
    correctCount: body.correctCount,
    totalSongs: body.totalSongs,
    mode: 'ranked',
    isFirstGameToday: streak.isFirstGameToday,
    isPerfectRound: body.correctCount === body.totalSongs,
    currentStreak: streak.newStreak,
  });
  const rankedXP = Math.round(baseXP * 1.2); // +20% ranked bonus

  // Award XP via RPC (includes streak bonus)
  const { data: xpResult } = await adminDb.rpc('award_bt_xp', {
    p_player_id: player.id,
    p_base_xp: rankedXP,
  });

  // Update player stats
  const newTotalXP = (xpResult?.[0]?.new_total as number) ?? player.total_xp + rankedXP;
  const levelInfo = getLevelFromXP(newTotalXP);

  await adminDb
    .from('bt_players')
    .update({
      total_games: player.total_games + 1,
      total_correct: player.total_correct + body.correctCount,
      total_songs_played: player.total_songs_played + body.totalSongs,
      best_score: Math.max(player.best_score, body.score),
      best_combo: Math.max(player.best_combo, body.bestCombo),
      current_streak: streak.newStreak,
      last_played_date: new Date().toISOString().split('T')[0],
      level: levelInfo.level,
    })
    .eq('id', player.id);

  const rankedUp = xpResult?.[0]?.ranked_up ?? false;
  const newRank = xpResult?.[0]?.new_rank ?? player.rank_title;

  return NextResponse.json({
    saved: true,
    xpEarned: rankedXP,
    totalXP: newTotalXP,
    level: levelInfo.level,
    title: levelInfo.title,
    leveledUp: levelInfo.level > player.level,
    oldLevel: player.level,
    streak: streak.newStreak,
    isFirstGameToday: streak.isFirstGameToday,
    isPerfectRound: body.correctCount === body.totalSongs,
    rankedUp,
    newRank,
  });
}
