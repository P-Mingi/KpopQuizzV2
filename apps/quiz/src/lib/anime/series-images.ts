// Run O1 (IMG): the free photo of a series, as the anime components read it: the types and licence rules of series-images-rules.ts
// and the lookup in the generated map (series-images.generated.ts, from docs/anime/images/*.json by scripts/gen-series-images.mts).

import { SERIES_IMAGES } from './series-images.generated';
import { creditLine, LICENSE_PATTERN, licenseRequiresAttribution } from './series-images-rules';

import type { SeriesImage, SeriesPhoto } from './series-images-rules';

export type { SeriesImage, SeriesImageAttribution, SeriesImageCredit, SeriesPhoto } from './series-images-rules';
export { creditLine, LICENSE_PATTERN, licenseRequiresAttribution };

/**
 * The photo of a series, or null when the title card is to be shown (no entry, or an entry that says fallback). `map` is the
 * generated one; a test passes its own.
 */
export function seriesImageOf(slug: string | null | undefined, map: Readonly<Record<string, SeriesImage>> = SERIES_IMAGES): SeriesPhoto | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(map, slug)) return null;
  const e = map[slug];
  if (!e || e.fallback || !e.file || !e.alt) return null;
  return { file: e.file, alt: e.alt, attribution: e.attribution };
}
