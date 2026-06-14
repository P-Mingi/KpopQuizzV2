import { getTitleForLevel } from './level-titles';

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

// Fan Level XP curve (L1). `xpRequired` = cumulative XP to REACH that level.
// Early levels come fast (frequent reward); later levels are a long-tail status
// flex. Curve: cum(L) = round(12.5 * (L-1)^2.5) to the nearest 10, giving
// L1=0, L5=400, L10=3040, L20=19670, L30=56590. `name` is pulled from the single
// title ladder (getTitleForLevel) so the curve and the worn title never drift.
export interface LevelDef { level: number; name: string; xpRequired: number }

const MAX_LEVEL = 50; // headroom; the ladder caps the worn title at "Legend" (30+)

function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round((12.5 * Math.pow(level - 1, 2.5)) / 10) * 10;
}

export const LEVELS: readonly LevelDef[] = Array.from({ length: MAX_LEVEL }, (_, i) => {
  const level = i + 1;
  return { level, name: getTitleForLevel(level).en, xpRequired: cumulativeXpForLevel(level) };
});

export function getLevelInfo(xp: number): {
  level: number;
  name: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number | null;
  progress: number;
} {
  let currentLevel: LevelDef = LEVELS[0]!;
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
