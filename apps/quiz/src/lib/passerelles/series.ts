// P5 (CR-025), links 11 and 12 (Plan.dc.html): the series pages of OtakuQuiz carry "The One Piece character of the day · Play" (and the same for Dragon Ball). Pure, no I/O.
// The anime build only, and only with the hub's dailyGuess on (the owner's switch, a code constant). Off, buildSeriesSlots gets null and the page is today's.
import { DLE_GAMES } from '@/lib/dle/games';
import { SITE_ID } from '@/lib/site/registry';

import { hubGameOpen } from './open';

import type { DleGameId } from '@/lib/dle/games';

/** The game of one series that this series page links to, or null: not the anime build, the switch off, no game of that series, its page missing from the hub. */
export function seriesDailyGame(seriesSlug: string): DleGameId | null {
  if (SITE_ID !== 'anime') return null;
  const g = DLE_GAMES.find((x) => x.series?.slug === seriesSlug);
  return g && hubGameOpen(g.id) ? g.id : null;
}
