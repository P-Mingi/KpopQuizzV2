/**
 * K-pop fan culture level titles. Maps the existing 1-10 XP level system
 * (see `lib/constants.ts`) onto the fandom-tier vocabulary used at display
 * sites: profile header, level badge, hall-of-fame rows, level-up overlay.
 *
 * Thresholds up to level 50 are defined so the catalogue is ready when the
 * XP system expands; `getTitleForLevel` returns the title for the highest
 * threshold <= the input level.
 */

export interface LevelTitle {
  en: string;
  kr: string;
}

export const LEVEL_TITLES: Record<number, LevelTitle> = {
  1: { en: 'Casual listener', kr: '캐주얼' },
  5: { en: 'Baby fan', kr: '아기팬' },
  10: { en: 'Stan', kr: '덕' },
  15: { en: 'Hard stan', kr: '덕덕' },
  20: { en: 'Ult stan', kr: '최애' },
  25: { en: 'Fandom leader', kr: '리더' },
  30: { en: 'Idol trainee', kr: '연습생' },
  35: { en: 'Debut ready', kr: '데뷔' },
  40: { en: 'Main vocal', kr: '메인보컬' },
  45: { en: 'Center', kr: '센터' },
  50: { en: 'All-kill', kr: '올킬' },
};

const SORTED_THRESHOLDS: number[] = Object.keys(LEVEL_TITLES)
  .map((k) => parseInt(k, 10))
  .sort((a, b) => a - b);

/**
 * Returns the fan-culture title for a given level. Picks the highest
 * threshold that is <= `level`. Guaranteed to return a value for any
 * positive integer level (defaults to the level-1 title).
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
