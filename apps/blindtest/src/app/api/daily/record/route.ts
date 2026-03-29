import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { checkAchievements } from '@/lib/achievement-checker';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
  }

  const body = await req.json();
  const serviceClient = createServiceRoleClient();

  // Verify one-play-per-day
  const { data: existing } = await serviceClient
    .from('daily_challenge_plays')
    .select('id')
    .eq('player_id', user.id)
    .eq('challenge_id', body.challenge_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already played' }, { status: 400 });
  }

  // Record the daily play
  await serviceClient.from('daily_challenge_plays').insert({
    player_id: user.id,
    challenge_id: body.challenge_id,
    score: body.score,
    correct: body.correct,
    total_time: body.total_time,
    songs: body.songs,
  });

  // Also record as regular play for XP/mastery
  await serviceClient.rpc('record_bt_play', {
    p_player_id: user.id,
    p_mode_id: 'daily',
    p_score: body.score,
    p_correct: body.correct,
    p_total: body.total,
    p_total_time: body.total_time,
    p_best_combo: body.best_combo,
    p_songs: body.songs,
    p_xp_earned: body.xp_earned,
    p_group_mastery_updates: body.group_mastery_updates ?? [],
  });

  // Check achievements
  let newAchievements: string[] = [];
  try {
    const { data: player } = await serviceClient
      .from('players').select('current_streak, total_songs_correct').eq('id', user.id).single();
    const { data: masteries } = await serviceClient
      .from('player_group_mastery').select('mastery_level, groups!inner(slug)').eq('player_id', user.id);
    const { data: existingAch } = await serviceClient
      .from('player_achievements').select('achievement_id').eq('player_id', user.id);

    if (player) {
      newAchievements = await checkAchievements(
        user.id,
        { mode_id: 'daily', correct: body.correct, total: body.total, best_combo: body.best_combo, songs: body.songs },
        { current_streak: player.current_streak, total_songs_correct: player.total_songs_correct },
        (masteries ?? []) as unknown as { mastery_level: number; groups: { slug: string } | null }[],
        (existingAch ?? []).map((a: { achievement_id: string }) => a.achievement_id),
        serviceClient,
      );
    }
  } catch { /* don't block */ }

  // Get player rank
  const { data: allPlays } = await serviceClient
    .from('daily_challenge_plays')
    .select('player_id, score')
    .eq('challenge_id', body.challenge_id)
    .order('score', { ascending: false });

  const rank = (allPlays ?? []).findIndex((p: { player_id: string }) => p.player_id === user.id) + 1;

  return NextResponse.json({
    success: true,
    rank,
    total_players: allPlays?.length ?? 0,
    new_achievements: newAchievements,
  });
}
