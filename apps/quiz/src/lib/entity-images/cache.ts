// Run O1 (ADM back): the cache tag of one image and its revalidation. Every write of an image calls revalidateImage.
import { revalidateTag } from 'next/cache';

import { tagsOfImage } from './constants';

import type { RevalidateTag } from '@/lib/admin/revalidate';
import type { SiteId } from '@/lib/site/types';
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

/**
 * ADMIN-2: what a write of a picture of `site` expires on the deployment of that site, as tags of the closed list of the cross-site call
 * (lib/admin/revalidate.ts, sent by revalidateSite). OtakuQuiz reads its pictures as one list (IMAGES_LIST_TAG, which the closed list holds as
 * 'entity-images:anime'); the credits pages and the games of every site read the verified pictures (entity_images_public).
 */
export function pictureTags(site: SiteId): RevalidateTag[] {
  return site === 'anime' ? ['entity-images:anime', 'entity-images-public'] : ['entity-images-public'];
}

/** The live banners, icons and stickers of bunnyverse.org (site_assets_public): what a write of an asset expires on the hub. */
export const ASSET_TAGS: readonly RevalidateTag[] = ['site-assets'];
