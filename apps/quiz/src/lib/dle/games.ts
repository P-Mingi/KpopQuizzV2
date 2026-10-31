// Daily games (step 1): the games of the Terrier and their future addresses on bunnyverse.org. Pure, no I/O.
//
// The games live in the hub (app/sites/[site]/(hub)/..., v2 section 9), English addresses, French under /fr with the same
// words (v2 section 2): the names of the games are brands and are never translated. Step 4 adds the first pages (/daily, /kpopdle and
// their French twins, /fr/credits). A game has a page when DLE_BUILT_GAMES of registry.ts lists it: that one line opens its routes in the hub's route map, its
// tile and its rows, so a new game is that line, its data and one page. Everything stays closed while the hub's dailyGuess flag is off.
import { DLE_BUILT_GAMES, dleLivePaths } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

import type { DleLocale } from './types';

export type DleGameId = 'kpopdle-idol' | 'kpopdle-group' | 'kpopdle-song' | 'otakudle';

export interface DleGameDef {
  readonly id: DleGameId;
  /** The site whose passport gets the XP and the streak (never the hub). */
  readonly universe: Extract<SiteId, 'kpop' | 'anime'>;
  readonly brand: 'Kpopdle' | 'Otakudle';
  /** The English path; the French one is /fr + path. */
  readonly path: string;
  /** What the player guesses, per locale. */
  readonly guess: Readonly<Record<DleLocale, string>>;
  /** Its page exists (DLE_BUILT_GAMES of registry.ts): its routes open with the flag, its tile and rows link to it. */
  readonly built: boolean;
  /** The hints of the game in order, with the errors that open each one (dle_games.hint_keys and hint_after of its migration). */
  readonly hints: readonly { readonly key: string; readonly after: number }[];
  /** The kind of its pictures in entity_images_public (never used as a clue). */
  readonly photoKind: 'idol' | 'group' | 'character' | null;
}

/** The Terrier (The Burrow): every daily game of the day. */
export const DAILY_PATH = '/daily';

const isBuilt = (id: DleGameId): boolean => DLE_BUILT_GAMES.some((g) => g.id === id);

export const DLE_GAMES: readonly DleGameDef[] = [
  { id: 'kpopdle-idol', universe: 'kpop', brand: 'Kpopdle', path: '/kpopdle', guess: { en: 'Idol of the day', fr: 'Idol du jour' }, built: isBuilt('kpopdle-idol'), hints: [{ key: 'fandom', after: 5 }, { key: 'initial', after: 12 }], photoKind: 'idol' },
  { id: 'kpopdle-group', universe: 'kpop', brand: 'Kpopdle', path: '/kpopdle/group', guess: { en: 'Group of the day', fr: 'Groupe du jour' }, built: isBuilt('kpopdle-group'), hints: [], photoKind: 'group' },
  { id: 'kpopdle-song', universe: 'kpop', brand: 'Kpopdle', path: '/kpopdle/song', guess: { en: 'Song of the day', fr: 'Chanson du jour' }, built: isBuilt('kpopdle-song'), hints: [], photoKind: null },
  { id: 'otakudle', universe: 'anime', brand: 'Otakudle', path: '/otakudle', guess: { en: 'Character of the day', fr: 'Personnage du jour' }, built: isBuilt('otakudle'), hints: [{ key: 'first_appearance', after: 5 }, { key: 'voice_actor_ja', after: 8 }, { key: 'initial', after: 12 }], photoKind: null },
];

/** One Otakudle per series lives at /otakudle/{series}; these words are taken by other pages of the Terrier (v2 section 2). */
export const RESERVED_SERIES_SLUGS: readonly string[] = ['series', 'archive', 'group', 'song', 'hidden-members'];

const SERIES_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;

export function dleGame(id: DleGameId): DleGameDef {
  const g = DLE_GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`unknown dle game ${id}`);
  return g;
}

/** A path of the Terrier in a locale: English as is, French under /fr with the same words. */
export function localePath(path: string, locale: DleLocale): string {
  if (locale === 'en') return path;
  return path === '/' ? '/fr' : `/fr${path}`;
}

export function dlePath(id: DleGameId, locale: DleLocale = 'en'): string {
  return localePath(dleGame(id).path, locale);
}

/** The Otakudle of one series (/otakudle/one-piece); null for a slug that is not a series slug or is a reserved word. */
export function seriesPath(series: string, locale: DleLocale = 'en'): string | null {
  if (!SERIES_SLUG.test(series) || RESERVED_SERIES_SLUGS.includes(series)) return null;
  return localePath(`/otakudle/${series}`, locale);
}

/** Every future page of the Terrier in both locales (the series pages as their pattern), for the route checks. */
export function futurePaths(): readonly string[] {
  const en = [DAILY_PATH, ...DLE_GAMES.map((g) => g.path), '/otakudle/{series}'];
  return [...en, ...en.map((p) => localePath(p, 'fr'))];
}

/** The French twin of /credits: it opens with the Burrow (v2 section 2). */
export const FR_CREDITS_PATH = '/fr/credits';

export { BURROW_INTERNAL, SHARE_INTERNAL, SHARE_R_PATTERN } from '@/lib/site/routing';

/** The games that have a page. */
export function builtGames(): readonly DleGameDef[] {
  return DLE_GAMES.filter((g) => g.built);
}

/** Every page of the Terrier that exists, in both locales. The hub's route map adds these with the flag on (registry.ts), and only then. */
export const livePaths = dleLivePaths;

