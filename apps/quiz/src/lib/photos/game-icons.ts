// o1/adminpics (owner): "let me change those icons". The daily game cards of the two home pages draw a grid of small squares; the owner can upload his
// own icon per game in the admin (Photos, Bannières et images, "Icône de la carte ..."). A slot with a live picture (site_assets_public: published,
// licence verified, never a draft or a retired one) replaces the grid; with none the card keeps the grid, byte for byte. Fail closed: getLiveAssets
// answers [] on any failure, so a page never loses its card for a picture.
import { assetPosition, getLiveAssets } from './public-read';
import { GAME_ICON_GAMES, gameIconKey } from './slots';

import type { LiveAsset } from './public-read';

/** One live icon: the 400 px file (the box is 100 by 80, so it stays sharp at 2x) and its focal point (CSS object-position). */
export interface GameIcon {
  readonly src: string;
  readonly position: string;
}

/** The live icons by game id; a game with no live picture is absent. */
export type GameIcons = Readonly<Partial<Record<string, GameIcon>>>;

export function gameIconsOf(live: readonly LiveAsset[]): GameIcons {
  const byKey = new Map(live.filter((a) => a.type === 'card_image').map((a) => [a.key, a]));
  const out: Record<string, GameIcon> = {};
  for (const g of GAME_ICON_GAMES) {
    const a = byKey.get(gameIconKey(g.game));
    const src = a ? a.mid ?? a.large : null;
    if (a && src) out[g.game] = { src, position: assetPosition(a) };
  }
  return out;
}

/** The live icons, or {} on any failure (through the one-minute cache of public-read.ts). */
export async function loadGameIcons(): Promise<GameIcons> {
  try {
    return gameIconsOf(await getLiveAssets());
  } catch {
    return {};
  }
}

/** The box of the drawn grid (4 columns of 16 px, 4 px gaps, 12 px padding: 100 by 80) and its rounding, kept by the picture that replaces it. */
export const GAME_ICON_BOX_STYLE = { display: 'block', width: 100, height: 80, padding: 0, overflow: 'hidden', boxSizing: 'border-box' } as const;
