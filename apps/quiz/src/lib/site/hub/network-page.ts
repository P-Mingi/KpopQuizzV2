// Run O1, lot (d), lane H1: the data of the network page (fanquiz.org, /). Pure: the sites come from the registry,
// the words of a card from the vocabulary of its site, the link from netOrigin (the registry url on production). No
// origin or site name is written here.

import { ht } from '@/lib/site/hub/copy';
import { netOrigin, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';

export interface NetworkCard {
  readonly id: SiteId;
  readonly name: string;
  /** The one-line pitch, from the vocabulary of the site. */
  readonly pitch: string;
  /** Where "Open" goes: the site origin. */
  readonly origin: string;
  /** The accent token (`pink`) of the site theme, light and dark; null when the theme carries none. */
  readonly accentLight: string | null;
  readonly accentDark: string | null;
}

/** The sites a visitor can open: every registry entry except the hub itself, in the network's display order. */
export function networkSiteIds(): SiteId[] {
  return SITE_IDS.filter((id) => REGISTRY[id].kind !== 'hub');
}

/** One card per site of the network other than the hub. */
export function networkCards(env: NetOriginEnv): NetworkCard[] {
  return networkSiteIds().map((id) => {
    const s = REGISTRY[id];
    const light = s.theme.light.pink ?? null;
    return {
      id,
      name: s.brand.name,
      pitch: ht('home.cardPitch', { topicPlural: s.vocabulary.topicPlural, memberPlural: s.vocabulary.memberPlural }),
      origin: netOrigin(id, env),
      accentLight: light,
      accentDark: s.theme.dark.pink ?? light,
    };
  });
}

/** The keys of the "What your passport shares" block, in reading order: what the other sites see, then what they do not. */
export const SHARES_SEES = ['shares.seesUsername', 'shares.seesAvatar', 'shares.seesLevel', 'shares.seesSites'] as const;
export const SHARES_HIDES = ['shares.hidesEmail', 'shares.hidesSignIn', 'shares.hidesHistory'] as const;
