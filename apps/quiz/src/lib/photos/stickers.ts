// The owner's stickers (admin Photos, tab Stickers, 2026-11-15: saved since step 2 of the daily games but drawn on no page until now).
// A sticker is a live row of site_assets_public, type 'sticker', page kpopdle, otakudle, daily or home, key sticker:<page>:<id>, with its
// settings as the admin's board saves them. The board draws a page as its main column, 1180 px wide (the max width of the main column of
// the daily games pages and of the home): a sticker sits x px from its side of that column, y px below its top, w px wide.
// components/hub/page-stickers.tsx draws them; styles/sites/hub/stickers.css hides them under 1240 px (the column has no empty side there).
import { parseStickerSettings } from './slots';

import type { LiveAsset } from './public-read';
import type { StickerSettings } from './slots';
import type { CSSProperties } from 'react';

export type StickerPage = 'kpopdle' | 'otakudle' | 'daily' | 'home';

export interface PageSticker {
  readonly key: string;
  readonly src: string;
  readonly settings: StickerSettings;
}

/** The stickers of a page, in the order of their keys; a row whose settings or file do not check out is left out. */
export function pageStickers(live: readonly LiveAsset[], page: StickerPage): PageSticker[] {
  const out: PageSticker[] = [];
  for (const a of live) {
    if (a.type !== 'sticker' || a.page !== page || !a.key.startsWith(`sticker:${page}:`)) continue;
    const settings = parseStickerSettings(a.settings);
    // The 400 px file (a sticker is at most 260 px wide on the page), else the 96 px one.
    const src = a.large ?? a.mid ?? a.thumb;
    if (settings && src) out.push({ key: a.key, src, settings });
  }
  return out;
}

/** Where and how a sticker is drawn in its column: the numbers of the admin's board, in CSS pixels. */
export function stickerStyle(s: StickerSettings): CSSProperties {
  return {
    ...(s.side === 'left' ? { left: s.x } : { right: s.x }),
    top: s.y,
    width: s.w,
    opacity: s.o / 100,
    transform: `rotate(${s.r}deg)${s.mirror ? ' scaleX(-1)' : ''}`,
  };
}
