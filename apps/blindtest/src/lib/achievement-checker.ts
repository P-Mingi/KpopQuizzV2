import { getFandomAchievementId } from './achievements';

import type { SupabaseClient } from '@supabase/supabase-js';

interface PlayRecord {
  mode_id: string;
  correct: number;
  total: number;
  best_combo: number;
  songs: { correct: boolean; time: number }[];
}

interface PlayerStats {
  current_streak: number;
  total_songs_correct: number;
}

interface GroupMasteryRow {
  mastery_level: number;
  groups: { slug: string } | null;
}

export async function checkAchievements(
  playerId: string,
  latestPlay: PlayRecord,
  playerStats: PlayerStats,
  masteries: GroupMasteryRow[],
  existingAchievements: string[],
  supabase: SupabaseClient,
): Promise<string[]> {
  const newAchievements: string[] = [];

  function award(id: string) {
    if (!existingAchievements.includes(id) && !newAchievements.includes(id)) {
      newAchievements.push(id);
    }
  }

  // -- Skill badges --
  if (latestPlay.correct === latestPlay.total && latestPlay.total >= 5) {
    award('perfect_ear');
  }
  if (latestPlay.mode_id === 'speed-round' && latestPlay.correct === latestPlay.total) {
    award('speed_demon');
  }
  if (latestPlay.songs.some(s => s.correct && s.time < 1)) {
    award('lightning_strike');
  }
  if (latestPlay.best_combo >= 10) {
    award('combo_king');
  }
  if (latestPlay.correct === latestPlay.total && latestPlay.songs.every(s => s.correct && s.time < 3)) {
    award('no_mercy');
  }

  // -- Fandom badges (mastery level 5+) --
  for (const m of masteries) {
    const slug = (m.groups as { slug: string } | null)?.slug;
    if (m.mastery_level >= 5 && slug) {
      award(getFandomAchievementId(slug));
    }
  }

  // -- Dedication badges --
  const masteryAt3Plus = masteries.filter(m => m.mastery_level >= 3).length;
  if (masteryAt3Plus >= 5) award('multi_stan');

  if (playerStats.current_streak >= 7) award('week_warrior');
  if (playerStats.current_streak >= 30) award('monthly_devotion');
  if (playerStats.current_streak >= 100) award('centurion');

  if (playerStats.total_songs_correct >= 100) award('song_collector_100');
  if (playerStats.total_songs_correct >= 500) award('song_collector_500');
  if (playerStats.total_songs_correct >= 1000) award('song_collector_1000');

  // Daily challenge badges
  const { count: dailyCount } = await supabase
    .from('daily_challenge_plays')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId);
  if ((dailyCount ?? 0) >= 1) award('daily_first');
  if ((dailyCount ?? 0) >= 10) award('daily_10');
  if ((dailyCount ?? 0) >= 50) award('daily_50');

  // -- Insert new achievements --
  if (newAchievements.length > 0) {
    await supabase.from('player_achievements').insert(
      newAchievements.map(id => ({ player_id: playerId, achievement_id: id }))
    );
  }

  return newAchievements;
}
