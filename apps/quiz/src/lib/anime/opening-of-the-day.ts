// Run O1, owner order of 2026-10-26: OtakuQuiz has no blind test, so the Opening of the day no longer sends to /blindtest. It opens the
// openings quiz of the series that today's opening (daily_openings, site 'anime', UTC date) belongs to; with no row, or on any error, the
// series index. Reads only; no write, no rpc.

import { forSite } from '@/lib/site/scope';

import type { SeriesDb } from './series';

/** Where the Opening of the day falls back to. */
export const SERIES_DIRECTORY_PATH = '/series';

interface Result<T> { data: T | null; error: { message: string } | null }

/** The UTC date of `now` as YYYY-MM-DD. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** The public path the Opening of the day opens: /{series}-openings-quiz, else the series index. */
export async function openingOfTheDayPath(db: SeriesDb, now: Date = new Date()): Promise<string> {
  try {
    const day = (await db.from('daily_openings').select('theme_id').eq('site_id', 'anime').eq('date', utcDay(now)).maybeSingle()) as Result<{ theme_id: number }>;
    if (day.error || !day.data) return SERIES_DIRECTORY_PATH;
    const theme = (await db.from('series_themes').select('group_id').eq('id', day.data.theme_id).eq('status', 'published').maybeSingle()) as Result<{ group_id: number }>;
    if (theme.error || !theme.data) return SERIES_DIRECTORY_PATH;
    const group = (await forSite(db.from('groups').select('slug'), 'anime').eq('id', theme.data.group_id).maybeSingle()) as Result<{ slug: string }>;
    if (group.error || !group.data?.slug) return SERIES_DIRECTORY_PATH;
    return `/${group.data.slug}-openings-quiz`;
  } catch {
    return SERIES_DIRECTORY_PATH;
  }
}
