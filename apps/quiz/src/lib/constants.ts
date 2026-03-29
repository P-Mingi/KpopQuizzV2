export const RESERVED_USERNAMES = [
  'admin',
  'api',
  'auth',
  'create',
  'login',
  'onboarding',
  'trending',
  'new',
  'group',
  'q',
  'u',
  'settings',
  'about',
  'contact',
  'terms',
  'privacy',
  'help',
  'support',
  'search',
] as const;

export const LEVELS = [
  { level: 1,  name: 'Trainee',     xpRequired: 0 },
  { level: 2,  name: 'Rookie',      xpRequired: 100 },
  { level: 3,  name: 'Debut',       xpRequired: 300 },
  { level: 4,  name: 'Rising star', xpRequired: 700 },
  { level: 5,  name: 'Main vocal',  xpRequired: 1500 },
  { level: 6,  name: 'Center',      xpRequired: 3000 },
  { level: 7,  name: 'Leader',      xpRequired: 6000 },
  { level: 8,  name: 'All-rounder', xpRequired: 10000 },
  { level: 9,  name: 'Legend',       xpRequired: 18000 },
  { level: 10, name: 'Hall of fame', xpRequired: 30000 },
] as const;

export function getLevelInfo(xp: number): {
  level: number;
  name: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number | null;
  progress: number;
} {
  let currentLevel: (typeof LEVELS)[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) currentLevel = lvl;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const xpIntoLevel = xp - currentLevel.xpRequired;
  const xpNeeded = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;
  const progress = nextLevel ? Math.min(Math.round((xpIntoLevel / xpNeeded) * 100), 100) : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    currentXp: xp,
    xpForCurrentLevel: currentLevel.xpRequired,
    xpForNextLevel: nextLevel?.xpRequired ?? null,
    progress,
  };
}
