// Run O1 (ADM front): the owner's pictures of the series, as the display components read them. A plain module-level map, set before the
// components render: on the server by the site layout (it reads the cached rows and calls setOwnerSeriesPictures), in the browser by the
// ArtRegistry island, which sets it from the same props before any later node of the page renders (the same order SERIES_ART relies on).
// The server graph and the client graph are separate module graphs, so each holds its own copy of this map, and both hold the same data.
// Characters are never put here: their names are spoiler-bearing, so a page passes the pictures of the characters it may show.

import type { OwnerPicture } from './entity-images-rules';

let SERIES: Readonly<Record<string, OwnerPicture>> = {};

export function setOwnerSeriesPictures(map: Readonly<Record<string, OwnerPicture>>): void {
  SERIES = map;
}

/** The owner's picture of a series, or null when none was uploaded (the bundled photo, then the placeholder, follow). */
export function ownerSeriesPicture(slug: string | null | undefined): OwnerPicture | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(SERIES, slug)) return null;
  return SERIES[slug] ?? null;
}
