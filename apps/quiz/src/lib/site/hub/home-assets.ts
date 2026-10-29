// Home v3 (2026-10-29, docs/strategy/o1/dle/RAPPORT-JEUX-DU-JOUR-v2.md section 3): the image slots of the home, chosen by the owner in the
// admin and stored in `site_assets` (step 2 of the daily games: the table, its public view, the thumbnails computed on upload). The slots: the
// image of each site (2, 3:2), the small image of each row of Today (Kpopdle, Otakudle, the K-pop and anime quizzes of the day, the debate)
// and the three Crossover tiles. The rows of Hot right now use the quiz's own cover instead.
// Until step 2 creates the table, the reader returns no image (owner, 2026-10-29): it reads nothing, so no request reaches a table that is
// not there. Every slot then keeps its background in the colours of its site. Step 2 replaces the body of readHomeAssets with the read of
// the public view; the page needs no other change.

import { safeBlock } from './home-safe';

/** The image slots of the home. */
export const HOME_ASSET_KEYS = ['siteK', 'siteA', 'kpopdle', 'otakudle', 'qotdK', 'qotdA', 'debate', 'cross1', 'cross2', 'cross3'] as const;
export type HomeAssetKey = (typeof HOME_ASSET_KEYS)[number];

/** One image of a slot: its URL (a thumbnail of the right size) and its focal point (CSS object-position). */
export interface HomeAsset {
  readonly src: string;
  readonly position: string;
}

/** The images the owner set; a slot with no image is absent. */
export type HomeAssets = Readonly<Partial<Record<HomeAssetKey, HomeAsset>>>;

/** The read of the slots (empty until the table exists). */
async function readHomeAssets(): Promise<HomeAssets> {
  return {};
}

export async function loadHomeAssets(): Promise<HomeAssets> {
  return safeBlock('assets', readHomeAssets, {});
}
