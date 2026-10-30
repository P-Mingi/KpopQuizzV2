// Home v3 (2026-10-29, docs/strategy/o1/dle/RAPPORT-JEUX-DU-JOUR-v2.md section 3): the image slots of the home, chosen by the owner in the
// admin and stored in `site_assets` (step 2 of the daily games: the table, its public view, the thumbnails computed on upload). The slots: the
// image of each site (2, 3:2), the small image of each row of Today (Kpopdle, Otakudle, the K-pop and anime quizzes of the day, the debate)
// and the three Crossover tiles. The rows of Hot right now use the quiz's own cover instead.
// Step 2 (2026-10-30): the read is the public view site_assets_public of migration 022 (lib/photos/public-read.ts), cached one minute. It
// fails closed: until 022 is applied, on any error, or with no Supabase settings at build time, it answers no image, and every slot keeps
// its background in the colours of its site. A slot gets the file of its size: the large one for the site cards, the 400 px one for the
// Crossover tiles, the 96 px one for the rows of Today (all made in the admin's browser at upload; no Vercel image optimisation).

import { getLiveAssets, assetPosition } from '@/lib/photos/public-read';
import { HOME_SLOT_KEY } from '@/lib/photos/slots';

import type { LiveAsset } from '@/lib/photos/public-read';

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

/** Which file of a slot the home draws: the large one, the 400 px one or the 96 px one (each falls back to the next larger file). */
const SIZE_OF: Readonly<Record<HomeAssetKey, 'large' | 'mid' | 'thumb'>> = {
  siteK: 'large', siteA: 'large', cross1: 'mid', cross2: 'mid', cross3: 'mid',
  kpopdle: 'thumb', otakudle: 'thumb', qotdK: 'thumb', qotdA: 'thumb', debate: 'thumb',
};

/** The images of the slots from the live rows of site_assets_public; a slot with no live picture is absent. */
export function homeAssetsOf(live: readonly LiveAsset[]): HomeAssets {
  const byKey = new Map(live.map((a) => [a.key, a]));
  const out: Partial<Record<HomeAssetKey, HomeAsset>> = {};
  for (const k of HOME_ASSET_KEYS) {
    const a = byKey.get(HOME_SLOT_KEY[k]);
    if (!a || a.type !== 'card_image' || !a.large) continue;
    const size = SIZE_OF[k];
    const src = size === 'thumb' ? a.thumb ?? a.mid ?? a.large : size === 'mid' ? a.mid ?? a.large : a.large;
    out[k] = { src, position: assetPosition(a) };
  }
  return out;
}

/** The read of the slots: the public view, through the one-minute cache (empty on any failure). */
async function readHomeAssets(read: () => Promise<readonly LiveAsset[]> = getLiveAssets): Promise<HomeAssets> {
  return homeAssetsOf(await read());
}

export async function loadHomeAssets(read?: () => Promise<readonly LiveAsset[]>): Promise<HomeAssets> {
  return safeBlock('assets', () => readHomeAssets(read), {});
}
