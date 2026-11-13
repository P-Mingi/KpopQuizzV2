// Lot 3 DLE (E3): the series photo behind a character's tile and card. The free photos of objects and places already in place on the anime pages
// (public/series/<slug>.webp, lib/anime/series-images.ts): nothing new is stored or fetched, no image from another site is ever used. Pure.
import { seriesImageOf } from '@/lib/anime/series-images';

import type { SeriesImage } from '@/lib/anime/series-images-rules';

/**
 * The public path of the photo of each series whose title is in `names`, by title. `slugs` is title to slug (the series the pool holds). A series
 * with no photo, or whose entry says it shows the title card, gets no entry: its characters get the patterned card in the colours of the series.
 */
export function seriesArtOf(
  slugs: Readonly<Record<string, string>>, names: readonly string[] = Object.keys(slugs), map?: Readonly<Record<string, SeriesImage>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const slug = slugs[name];
    const photo = slug ? (map ? seriesImageOf(slug, map) : seriesImageOf(slug)) : null;
    if (photo) out[name] = photo.file;
  }
  return out;
}
