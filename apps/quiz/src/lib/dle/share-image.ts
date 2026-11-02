// Daily games step 4 (v2 section 11.6): what the share image of a result draws, pure so a test pins it: the bars of right cells, the brand and the number of the guesses. Never the answer: the route knows nothing but these digits.
import { DLE_GAMES, SHARE_R_PATTERN } from './games';

import type { DleGameDef } from './games';
import type { DleLocale } from './types';

const R = new RegExp(`^${SHARE_R_PATTERN}$`);

export interface ShareImage { readonly game: DleGameDef; readonly locale: DleLocale; readonly counts: readonly number[]; readonly max: number }

/** The query of the route, checked: null for an unknown game; a bad `r` draws the plain card of the game. */
export function parseShareImage(game: string | null, locale: string | null, r: string | null): ShareImage | null {
  const g = DLE_GAMES.find((x) => x.id === game && x.built);
  if (!g) return null;
  const counts = r && R.test(r) ? r.split('-').map(Number) : [];
  return { game: g, locale: locale === 'fr' ? 'fr' : 'en', counts, max: Math.max(1, ...counts) };
}
