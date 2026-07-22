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
//
// The level is UNCAPPED: there is no maximum, so a fan can always grow. To keep
// that from ever becoming an impossible grind, the curve is a hybrid:
//   - Levels 1..30: the original polynomial cum(L) = round(12.5 * (L-1)^2.5),
//     giving L1=0, L5=400, L10=3040, L20=19670, L30=56620. Unchanged, so no
//     existing player re-levels.
//   - Levels 30+: LINEAR. Each level past 30 costs the same as the last
//     polynomial step (about 4,760 XP), so the endgame keeps rising forever but
//     never gets more expensive than reaching Legend did. L50=151,820,
//     L100=389,820 instead of the old curve's 210k / 1.2M.
//
// `name` is pulled from the single title ladder (getTitleForLevel), which tops
// out at "Legend" (30+), so every level past 30 is a numbered Legend tier.
export interface LevelDef { level: number; name: string; xpRequired: number }

// Where the polynomial early game hands off to the flat, endless endgame. This
// is the "Legend" threshold on purpose: becoming a Legend is the last curve
// milestone, and after that leveling is a steady eternal climb.
const CURVE_KNEE = 30;

function polyXp(level: number): number {
  return Math.round((12.5 * Math.pow(level - 1, 2.5)) / 10) * 10;
}

export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= CURVE_KNEE) return polyXp(level);
  const kneeXp = polyXp(CURVE_KNEE);
  const step = kneeXp - polyXp(CURVE_KNEE - 1); // the final polynomial step
  return kneeXp + (level - CURVE_KNEE) * step;
}

/** The uncapped level for a given XP. Analytic in the linear region. */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  const kneeXp = cumulativeXpForLevel(CURVE_KNEE);
  if (xp >= kneeXp) {
    const step = cumulativeXpForLevel(CURVE_KNEE + 1) - kneeXp;
    return CURVE_KNEE + Math.floor((xp - kneeXp) / step);
  }
  let level = 1;
  while (level < CURVE_KNEE && cumulativeXpForLevel(level + 1) <= xp) level++;
  return level;
}

// A bounded reference table of the named tiers (through the knee + a little
// headroom). Not a cap: getLevelInfo computes levels beyond it analytically.
const REFERENCE_LEVELS = 50;
export const LEVELS: readonly LevelDef[] = Array.from({ length: REFERENCE_LEVELS }, (_, i) => {
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
  const safeXp = Math.max(0, xp);
  const level = levelForXp(safeXp);
  const currentReq = cumulativeXpForLevel(level);
  const nextReq = cumulativeXpForLevel(level + 1); // always exists: uncapped
  const xpNeeded = nextReq - currentReq;
  const progress = xpNeeded > 0 ? Math.min(Math.round(((safeXp - currentReq) / xpNeeded) * 100), 100) : 0;

  return {
    level,
    name: getTitleForLevel(level).en,
    currentXp: safeXp,
    xpForCurrentLevel: currentReq,
    xpForNextLevel: nextReq,
    progress,
  };
}
