// Run O1 (ADM back): the cache tag of one image and its revalidation. Every write of an image calls revalidateImage.
import { revalidateTag } from 'next/cache';

import { imageTag } from './constants';

import type { ImageKind } from './constants';

/** Expires the cached read of one image at once (the next page render reads the new row). */
export function revalidateImage(kind: ImageKind, slug: string): void {
  try {
    revalidateTag(imageTag(kind, slug), { expire: 0 });
  } catch {
    // Outside a request (a script) there is no cache to expire.
  }
}
