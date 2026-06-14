/**
 * Fan Level title ladder (Workstream L1). The title is the reward worn
 * everywhere (next to the username on quizzes, battles, comments, leaderboard,
 * profile). `getTitleForLevel` is the single source of truth for the title at a
 * given Fan Level; `lib/constants.ts` derives `getLevelInfo().name` from it so
 * there is exactly one ladder.
 *
 * Ladder (fan-flavored, breakpoints per the L1 spec):
 *   1-2   New Fan
 *   3-5   Casual Fan
 *   6-9   Stan
 *   10-14 Bias
 *   15-20 Ride-or-Die
 *   21-29 Superfan
 *   30+   Legend
 */

export interface LevelTitle {
  en: string;
  kr: string;
}

export const LEVEL_TITLES: Record<number, LevelTitle> = {
  1: { en: 'New Fan', kr: '뉴비' },
  3: { en: 'Casual Fan', kr: '캐주얼' },
  6: { en: 'Stan', kr: '덕후' },
  10: { en: 'Bias', kr: '최애' },
  15: { en: 'Ride-or-Die', kr: '찐팬' },
  21: { en: 'Superfan', kr: '슈퍼팬' },
  30: { en: 'Legend', kr: '레전드' },
};

const SORTED_THRESHOLDS: number[] = Object.keys(LEVEL_TITLES)
  .map((k) => parseInt(k, 10))
  .sort((a, b) => a - b);

/**
 * Returns the fan title for a given Fan Level: the highest threshold that is
 * <= `level`. Guaranteed to return a value for any positive integer level
 * (defaults to the level-1 title).
 */
export function getTitleForLevel(level: number): LevelTitle {
  let result = LEVEL_TITLES[1]!;
  for (const threshold of SORTED_THRESHOLDS) {
    if (level >= threshold) {
      result = LEVEL_TITLES[threshold]!;
    } else {
      break;
    }
  }
  return result;
}
