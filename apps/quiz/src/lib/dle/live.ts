// Lane DLE2-A: the live numbers of a daily game page (the plays of the day in the meta line, the rank of a win), from L40 (dle_day.players_today, dle_plays.solve_rank). Pure, no I/O.
// Owner rule (2026-11-25): under 10 players the line and the rank are hidden. A missing number (L40 not applied yet) is hidden too.
import { formatCount } from './copy';

import type { DleLocale } from './types';

/** From this many players the count and the rank show. */
export const LIVE_FLOOR = 10;
/** The count of the meta line is read again this often while the tab is visible. */
export const LIVE_REFRESH_MS = 60_000;

/** The players of the day when they may be shown, else null (absent, not a number, or under the floor). */
export function shownPlayers(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= LIVE_FLOOR ? Math.floor(n) : null;
}

/** The rank when it may be shown: a whole number from 1 up to the players of the day, and the players pass the floor. */
export function shownRank(rank: unknown, players: unknown): number | null {
  const p = shownPlayers(players);
  if (p === null || typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1 || rank > p) return null;
  return rank;
}

/** 1er, 2e, 3e in French; 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st in English. */
export function ordinal(n: number, locale: DleLocale): string {
  if (locale === 'fr') return n === 1 ? '1er' : `${n}e`;
  const r100 = n % 100;
  if (r100 >= 11 && r100 <= 13) return `${n}th`;
  const r = n % 10;
  return `${n}${r === 1 ? 'st' : r === 2 ? 'nd' : r === 3 ? 'rd' : 'th'}`;
}

export interface LiveCopy {
  /** "1 234 joueurs aujourd’hui" */
  readonly playersToday: (n: number) => string;
  /** "prochain dans", before the clock */
  readonly nextShort: string;
  /** "Hier : ", before the name of yesterday's answer */
  readonly yesterdayShort: string;
  /** "Tu es le 3e à trouver Mikasa aujourd’hui" */
  readonly rankLine: (name: string, rank: number) => string;
  /** "sur 1 234 joueurs" */
  readonly outOf: (n: number) => string;
}

const WORDS: Readonly<Record<DleLocale, LiveCopy>> = {
  en: {
    playersToday: (n) => `${formatCount(n, 'en')} ${n === 1 ? 'player' : 'players'} today`,
    nextShort: 'next in',
    yesterdayShort: 'Yesterday: ',
    rankLine: (name, rank) => `You are the ${ordinal(rank, 'en')} to find ${name} today`,
    outOf: (n) => `out of ${formatCount(n, 'en')} players`,
  },
  fr: {
    playersToday: (n) => `${formatCount(n, 'fr')} ${n === 1 ? 'joueur' : 'joueurs'} aujourd’hui`,
    nextShort: 'prochain dans',
    yesterdayShort: 'Hier : ',
    rankLine: (name, rank) => `Tu es le ${ordinal(rank, 'fr')} à trouver ${name} aujourd’hui`,
    outOf: (n) => `sur ${formatCount(n, 'fr')} joueurs`,
  },
};

export const liveCopy = (locale: DleLocale): LiveCopy => WORDS[locale];
