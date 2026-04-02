/**
 * Progression system: XP, Levels, Mastery, Streaks.
 */

// ---- XP ----

export function calculateGameXP(params: {
  score: number;
  correctCount: number;
  totalSongs: number;
  mode: string;
  isFirstGameToday: boolean;
  isPerfectRound: boolean;
  currentStreak: number;
}): number {
  let xp = Math.round(params.score / 10);

  if (params.mode === 'challenge') xp = Math.round(xp * 1.5);
  if (params.mode === 'daily') xp += 200;
  if (params.isFirstGameToday) xp += 100;
  if (params.isPerfectRound) xp += 500;

  if (params.currentStreak >= 30) xp += 200;
  else if (params.currentStreak >= 7) xp += 100;
  else if (params.currentStreak >= 3) xp += 50;

  return xp;
}

// ---- Levels ----

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Trainee', 5: 'Rookie', 10: 'Fan', 15: 'Superfan',
  20: 'Expert', 25: 'Master', 30: 'Idol', 35: 'Superstar',
  40: 'Legend', 45: 'Hall of Fame', 50: 'K-pop God',
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(level * level * 150);
}

export function getLevelFromXP(totalXP: number): {
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressXP: number;
  progressPercent: number;
} {
  let level = 1;
  for (let l = 2; l <= 50; l++) {
    if (totalXP >= xpForLevel(l)) level = l;
    else break;
  }

  let title = 'Trainee';
  for (const [lvl, t] of Object.entries(LEVEL_TITLES)) {
    if (level >= parseInt(lvl)) title = t;
  }

  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = level >= 50 ? xpForLevel(50) : xpForLevel(level + 1);
  const progressXP = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((progressXP / xpNeeded) * 100)) : 100;

  return { level, title, currentLevelXP, nextLevelXP, progressXP, progressPercent };
}

// ---- Mastery ----

export function calculateMasteryStars(playCount: number, bestScore: number): number {
  if (playCount >= 50 && bestScore >= 7000) return 5;
  if (playCount >= 30) return 4;
  if (playCount >= 15) return 3;
  if (playCount >= 8) return 2;
  if (playCount >= 3) return 1;
  return 0;
}

export function nextMasteryThreshold(currentStars: number): number {
  const thresholds = [3, 8, 15, 30, 50];
  return thresholds[currentStars] ?? 50;
}

// ---- Streak ----

export function calculateStreak(lastPlayedDate: string | null, currentStreak: number): {
  newStreak: number;
  isFirstGameToday: boolean;
} {
  const today = new Date().toISOString().split('T')[0]!;

  if (!lastPlayedDate) {
    return { newStreak: 1, isFirstGameToday: true };
  }

  if (lastPlayedDate === today) {
    return { newStreak: currentStreak, isFirstGameToday: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;
  if (lastPlayedDate === yesterday) {
    return { newStreak: currentStreak + 1, isFirstGameToday: true };
  }

  return { newStreak: 1, isFirstGameToday: true };
}

// ---- Legacy compat (used by old components) ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMasteryProgress(_xp: number): any {
  return { level: 0, progress: 0, label: 'Beginner', xpToNext: 100, currentLevelXP: 0, nextLevelXP: 100 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateGroupMasteryUpdates(_results: any, _groupId: any): any[] {
  return [];
}
