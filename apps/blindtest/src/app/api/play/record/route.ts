import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { checkAchievements } from '@/lib/achievement-checker';

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = createServiceRoleClient();

  if (user) {
    // Logged in: record everything via the DB function
    await serviceClient.rpc('record_bt_play', {
      p_player_id: user.id,
      p_mode_id: body.mode_id,
      p_score: body.score,
      p_correct: body.correct,
      p_total: body.total,
      p_total_time: body.total_time,
      p_best_combo: body.best_combo,
      p_songs: body.songs,
      p_xp_earned: body.xp_earned,
      p_group_mastery_updates: body.group_mastery_updates ?? [],
    });

    // Check achievements after recording
    let newAchievements: string[] = [];
    try {
      const { data: player } = await serviceClient
        .from('players')
        .select('current_streak, total_songs_correct')
        .eq('id', user.id)
        .single();

      const { data: masteries } = await serviceClient
        .from('player_group_mastery')
        .select('mastery_level, groups!inner(slug)')
        .eq('player_id', user.id);

      const { data: existing } = await serviceClient
        .from('player_achievements')
        .select('achievement_id')
        .eq('player_id', user.id);

      if (player) {
        newAchievements = await checkAchievements(
          user.id,
          {
            mode_id: body.mode_id,
            correct: body.correct,
            total: body.total,
            best_combo: body.best_combo,
            songs: body.songs,
          },
          {
            current_streak: player.current_streak,
            total_songs_correct: player.total_songs_correct,
          },
          (masteries ?? []) as unknown as { mastery_level: number; groups: { slug: string } | null }[],
          (existing ?? []).map((a: { achievement_id: string }) => a.achievement_id),
          serviceClient,
        );
      }
    } catch {
      // Don't block the response if achievement check fails
    }

    return NextResponse.json({ success: true, new_achievements: newAchievements });
  } else {
    // Anonymous: only record the play (no player stats)
    await serviceClient.from('bt_plays').insert({
      player_id: null,
      mode_id: body.mode_id,
      score: body.score,
      correct: body.correct,
      total: body.total,
      total_time: body.total_time,
      best_combo: body.best_combo,
      songs: body.songs,
    });
  }

  return NextResponse.json({ success: true, new_achievements: [] });
}
