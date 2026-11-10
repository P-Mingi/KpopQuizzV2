// o1/slots (owner, 2026-11-10): the series games of Otakudle as one tiny pure list. The admin's Photos tab derives from it one step icon
// (icon:o-by-<id>), one banner (banner:otakudle/<id>) and one small square (daily:mode-byseries-<id>) per series, and lib/dle/worlds.ts
// derives the mode of each series from it, so a series added here gets its admin slots and its mode without touching the slots code.
// No import: lib/photos/slots.ts is bundled into the admin's client, so this file must never pull in the registry or a server module.
// A series also needs its game in lib/dle/games.ts (its words, hints, pool) and its line in DLE_BUILT_GAMES (registry.ts): series-slots.test.ts
// checks that both sides agree.

export interface DleSeriesStep {
  /** The slug of the series, lower case: the id of its mode and the end of its page (/otakudle/<id>), of its banner key and of its slot ids. */
  readonly id: string;
  /** The title shown on the page and in the admin. */
  readonly name: string;
  /** A name of ICON_LIBRARY: the default icon of its step. */
  readonly icon: string;
}

export const DLE_SERIES: readonly DleSeriesStep[] = [
  { id: 'one-piece', name: 'One Piece', icon: 'books' },
  { id: 'dragon-ball', name: 'Dragon Ball', icon: 'sparkle' },
];

/** The icon slot that every series falls back to, then its own default: the "Par série" slot of the board (a save on it is never lost). */
export const SERIES_ICON_FALLBACK = 'o-by';
/** The small square that every series falls back to. */
export const SERIES_MODE_FALLBACK = 'daily:mode-byseries';

export const seriesIconId = (id: string): string => `o-by-${id}`;
export const seriesBannerKey = (id: string): string => `banner:otakudle/${id}`;
export const seriesModeKey = (id: string): string => `daily:mode-byseries-${id}`;
