// Run O1 (IMG): the free photo of a series, as the anime components read it: the types and licence rules of series-images-rules.ts
// and the lookup in the generated map (series-images.generated.ts, from docs/anime/images/*.json by scripts/gen-series-images.mts).

import { ownerSrcSet } from './entity-images-rules';
import { ownerSeriesPicture } from './entity-images-store';
import { SERIES_IMAGES } from './series-images.generated';
import { creditLine, LICENSE_PATTERN, licenseRequiresAttribution } from './series-images-rules';

import type { SeriesImage, SeriesPhoto } from './series-images-rules';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

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
  // FandomVerse: the browser asks for the bundled file under the build's base path (/anime/series/<slug>.webp on the anime build).
  return { file: BASE_PATH ? BASE_PATH + e.file : e.file, alt: e.alt, attribution: e.attribution };
}

/**
 * The picture to show for a series, in the order the owner set (run O1, ADM): the image the owner uploaded first, else the bundled photo
 * (seriesImageOf), else null for the neutral placeholder (the title card). The owner's image has no description of its own: `alt` is the
 * series name the caller passes (the name is printed next to every picture anyway).
 */
export function seriesPhotoOf(slug: string | null | undefined, alt = '', map: Readonly<Record<string, SeriesImage>> = SERIES_IMAGES): SeriesPhoto | null {
  const own = ownerSeriesPicture(slug);
  if (own) return { file: own.src, alt, attribution: own.credit, owner: { position: own.position, width: own.width, height: own.height, srcSet: ownerSrcSet(own) } };
  return seriesImageOf(slug, map);
}
