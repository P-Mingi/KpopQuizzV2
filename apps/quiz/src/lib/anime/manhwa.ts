// Run O1, lot (manhwa): the "Manhwa" label of otakuquiz.org. A series is a manhwa when its `series.type` is `webtoon` (a
// Korean webtoon); the label is derived from that column and from nothing else (never from a list of slugs). The same word
// is printed on the series page, on its cards and in the series list. A manhwa that has an anime (the series data holds
// anime years, seasons or episodes) also says, on its page, that the anime adapts it. Pure: no I/O.

import { t } from './copy';

/** The `series.type` of a Korean webtoon. */
export const MANHWA_TYPE = 'webtoon';

/** What the label reads: the `type` column of a series row (or of a directory or related row, where it may be missing). */
export interface HasSeriesType { readonly type?: string | null | undefined }

export function isManhwaType(type: string | null | undefined): boolean {
  return type === MANHWA_TYPE;
}

/** "Manhwa" for a series typed webtoon, else null. */
export function manhwaLabel(type: string | null | undefined): string | null {
  return isManhwaType(type) ? t('series.manhwa') : null;
}

/** True when the series data says an anime exists: anime years, seasons or episodes. */
export function hasAnime(series: { readonly anime_start_year?: number | null | undefined; readonly seasons?: number | null | undefined; readonly episodes?: number | null | undefined }): boolean {
  return (series.anime_start_year ?? null) !== null || (series.seasons ?? 0) > 0 || (series.episodes ?? 0) > 0;
}

/** "The anime adapts the manhwa (Korean webtoon) Solo Leveling." for a manhwa that has an anime; null for any other series. */
export function adaptationLine(series: HasSeriesType & { readonly title_en: string; readonly anime_start_year?: number | null | undefined; readonly seasons?: number | null | undefined; readonly episodes?: number | null | undefined }): string | null {
  if (!isManhwaType(series.type) || !hasAnime(series)) return null;
  return t('series.manhwaAdapts', { title: series.title_en });
}

/** The eyebrow of a series page: the label first for a manhwa ("Manhwa · 3 fan-made quizzes"), the eyebrow itself otherwise. */
export function kindEyebrow(type: string | null | undefined, eyebrow: string): string {
  const label = manhwaLabel(type);
  return label ? `${label} · ${eyebrow}` : eyebrow;
}

/** The name of a series on a card that has no room for a chip: "Solo Leveling (Manhwa)" for a manhwa, the name otherwise. */
export function kindName(type: string | null | undefined, name: string): string {
  const label = manhwaLabel(type);
  return label ? `${name} (${label})` : name;
}
