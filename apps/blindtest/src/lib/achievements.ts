export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'skill' | 'fandom' | 'dedication';
  color: 'gold' | 'pink' | 'green' | 'default';
  condition: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // -- Skill --
  { id: 'perfect_ear', name: 'Perfect Ear', description: '10/10 on any mode', category: 'skill', color: 'green', condition: 'Score 10/10 on any blind test mode' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Perfect speed round', category: 'skill', color: 'pink', condition: 'Score 20/20 on Speed Round mode' },
  { id: 'lightning_strike', name: 'Lightning Strike', description: 'Answer in under 1 second', category: 'skill', color: 'gold', condition: 'Answer a song correctly in under 1 second' },
  { id: 'combo_king', name: 'Combo King', description: '10-song combo streak', category: 'skill', color: 'gold', condition: 'Get 10 correct answers in a row in a single game' },
  { id: 'no_mercy', name: 'No Mercy', description: 'Perfect score + all under 3s', category: 'skill', color: 'gold', condition: 'Score 10/10 with every answer under 3 seconds' },

  // -- Dedication --
  { id: 'multi_stan', name: 'Multi-stan', description: 'Level 3+ on 5 groups', category: 'dedication', color: 'pink', condition: 'Reach mastery level 3 on 5 different groups' },
  { id: 'all_rounder', name: 'All-rounder', description: 'Played every mode', category: 'dedication', color: 'default', condition: 'Play at least one game in every available mode' },
  { id: 'week_warrior', name: 'Week Warrior', description: '7-day streak', category: 'dedication', color: 'default', condition: 'Maintain a 7-day play streak' },
  { id: 'monthly_devotion', name: 'Monthly Devotion', description: '30-day streak', category: 'dedication', color: 'gold', condition: 'Maintain a 30-day play streak' },
  { id: 'centurion', name: 'Centurion', description: '100-day streak', category: 'dedication', color: 'gold', condition: 'Maintain a 100-day play streak' },
  { id: 'song_collector_100', name: 'Song Collector', description: '100 unique songs guessed', category: 'dedication', color: 'default', condition: 'Correctly guess 100 unique songs' },
  { id: 'song_collector_500', name: 'Song Master', description: '500 unique songs guessed', category: 'dedication', color: 'pink', condition: 'Correctly guess 500 unique songs' },
  { id: 'song_collector_1000', name: 'Song Legend', description: '1000 unique songs guessed', category: 'dedication', color: 'gold', condition: 'Correctly guess 1000 unique songs' },
  { id: 'daily_first', name: 'Daily Debut', description: 'Complete your first daily', category: 'dedication', color: 'default', condition: 'Complete your first daily challenge' },
  { id: 'daily_10', name: 'Daily Regular', description: '10 daily challenges done', category: 'dedication', color: 'default', condition: 'Complete 10 daily challenges' },
  { id: 'daily_50', name: 'Daily Devotee', description: '50 daily challenges done', category: 'dedication', color: 'pink', condition: 'Complete 50 daily challenges' },
];

// Fandom achievements are generated dynamically per group
export function getFandomAchievementId(groupSlug: string): string {
  return `fandom_${groupSlug}`;
}

export function getFandomAchievementName(groupName: string, fandomName?: string): string {
  return fandomName ? `${fandomName} Certified` : `${groupName} Lv.5`;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
