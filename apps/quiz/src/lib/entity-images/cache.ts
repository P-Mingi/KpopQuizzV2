// Run O1 (ADM back): the cache tag of one image and its revalidation. Every write of an image calls revalidateImage.
import { revalidateTag } from 'next/cache';

import { tagsOfImage } from './constants';

import type { ImageKind } from './constants';

/**
 * Expires, at once, every cached read of one image: the read of that image and the list read of the display (tagsOfImage), so the next
 * page render reads the new row. Each tag is expired on its own, so a failure on one never leaves the other stale.
 */
export function revalidateImage(kind: ImageKind, slug: string): void {
  for (const tag of tagsOfImage(kind, slug)) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // Outside a request (a script) there is no cache to expire.
    }
  }
}
