// Under the input of each game: "Yesterday's character was X". Pure, no I/O. The name comes from dle_day (the server's read, without a token), and only the answer of the day before the
// day dle_day itself returns: its date must be that day minus one (addDays of day.ts, the calendar of the game). Anything else, today's date included, answers null, so a line can never
// carry the answer of the day being played. dle_day gives `yesterday` only once yesterday is closed (03:00 UTC), so the line is also absent in the first three hours of a day.
import { addDays } from './day';

import type { DleDay, DleLocale } from './types';

/** The name of yesterday's answer, or null: no yesterday, a yesterday that is not exactly the day before, or an answer with no name. */
export function yesterdayName(day: Pick<DleDay, 'date' | 'game_no' | 'yesterday'> | null | undefined): string | null {
  const y = day?.yesterday;
  if (!day || !y) return null;
  if (y.date !== addDays(day.date, -1) || y.game_no !== day.game_no - 1) return null;
  const name = y.answer?.name;
  return typeof name === 'string' && name.trim() ? name : null;
}

/** "Yesterday’s idol was X" / "L’idol d’hier était X": the game's own line ("Yesterday’s idol:") without its colon, then the verb, then the name. */
export function yesterdayWasText(locale: DleLocale, line: string, name: string): string {
  return `${line.replace(/\s*:\s*$/, '')} ${locale === 'fr' ? 'était' : 'was'} ${name}`;
}
