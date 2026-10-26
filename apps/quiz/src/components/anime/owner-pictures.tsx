'use client';

import { setOwnerSeriesPictures } from '@/lib/anime/entity-images-store';

import type { OwnerPicture } from '@/lib/anime/entity-images-rules';

interface OwnerPicturesProps {
  /** The owner's pictures of the series by slug (run O1, ADM): the site layout reads them from the database and passes them on. */
  readonly owner: Readonly<Record<string, OwnerPicture>>;
}

/**
 * Run O1 (ADM): hands the owner's pictures of the series to the client graph's copy of the store, in its body, so every node after it (the art
 * of a card, a row, a header) draws the owner's image, on the server render of the client components and at hydration alike. The anime
 * layout renders it right after ArtRegistry and before the shell, the order the SERIES_ART slot relies on. Draws nothing.
 */
export function OwnerPictures({ owner }: OwnerPicturesProps): null {
  setOwnerSeriesPictures(owner);
  return null;
}
