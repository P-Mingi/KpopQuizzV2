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
// Fan-culture titles with Korean subtitle. Each threshold is inclusive: level N
// picks the title whose threshold is <= N. Displayed as "Lv.12 · Stan (덕)".

export interface LevelTitle {
  en: string;
  kr: string;
}

export const LEVEL_TITLES: Record<number, LevelTitle> = {
  1:  { en: 'Casual listener', kr: '\uCE90\uC8FC\uC5BC' },       // 캐주얼
  5:  { en: 'Baby fan',        kr: '\uC544\uAE30\uD32C' },        // 아기팬
  10: { en: 'Stan',            kr: '\uB355' },                    // 덕
  15: { en: 'Hard stan',       kr: '\uB355\uB355' },              // 덕덕
  20: { en: 'Ult stan',        kr: '\uCD5C\uC560' },              // 최애
  25: { en: 'Fandom leader',   kr: '\uB9AC\uB354' },              // 리더
  30: { en: 'Idol trainee',    kr: '\uC5F0\uC2B5\uC0DD' },        // 연습생
  35: { en: 'Debut ready',     kr: '\uB370\uBDD4' },              // 데뷔
  40: { en: 'Main vocal',      kr: '\uBA54\uC778\uBCF4\uCEEC' },  // 메인보컬
  45: { en: 'Center',          kr: '\uC13C\uD130' },              // 센터
  50: { en: 'All-kill',        kr: '\uC62C\uD0AC' },              // 올킬
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(level * level * 150);
}

export function getLevelFromXP(totalXP: number): {
  level: number;
  title: string;
  titleKr: string;
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

  let title = LEVEL_TITLES[1]!.en;
  let titleKr = LEVEL_TITLES[1]!.kr;
  for (const [lvl, t] of Object.entries(LEVEL_TITLES)) {
    if (level >= parseInt(lvl)) {
      title = t.en;
      titleKr = t.kr;
    }
  }

  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = level >= 50 ? xpForLevel(50) : xpForLevel(level + 1);
  const progressXP = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = xpNeeded > 0 ? Math.min(100, Math.round((progressXP / xpNeeded) * 100)) : 100;

  return { level, title, titleKr, currentLevelXP, nextLevelXP, progressXP, progressPercent };
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
