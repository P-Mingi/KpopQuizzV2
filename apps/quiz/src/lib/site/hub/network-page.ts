// Run O1, lot (d), lane H1: the data of the network page (fanquiz.org, /). Pure: the sites come from the registry,
// the words of a card from the vocabulary of its site, the link from netOrigin (the registry url on production). No
// origin or site name is written here.

import { ht } from '@/lib/site/hub/copy';
import { netOrigin, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { COPY as H1 } from '@/copy/hub/h1';
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

// ---------------------------------------------------------------------------------------------------------------------------
// The privacy page (DRAFT, owner to validate): its keys in reading order. The page (components/hub/hub-privacy.tsx) renders
// this list and nothing else, so a key that is not listed here is not on the page.

/** One block of a section: a paragraph, a bullet list, or the "What your passport shares" block of the network page. */
export type PrivacyBlock =
  | { readonly kind: 'p'; readonly key: PrivacyKey }
  | { readonly kind: 'list'; readonly keys: readonly PrivacyKey[] }
  | { readonly kind: 'shares' };
export type PrivacyKey = Extract<keyof typeof H1, `privacy.${string}`>;

export interface PrivacySection {
  readonly title: PrivacyKey;
  readonly blocks: readonly PrivacyBlock[];
}

/** The head of the page: metadata, banner, H1, lede, date line. */
export const PRIVACY_PAGE = {
  metaTitle: 'privacy.metaTitle',
  metaDescription: 'privacy.metaDescription',
  draftBanner: 'privacy.draftBanner',
  h1: 'privacy.h1',
  lede: 'privacy.lede',
  updated: 'privacy.updated',
} as const satisfies Record<string, PrivacyKey>;

const p = (key: PrivacyKey): PrivacyBlock => ({ kind: 'p', key });
const list = (...keys: PrivacyKey[]): PrivacyBlock => ({ kind: 'list', keys });

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  { title: 'privacy.who.title', blocks: [p('privacy.who.p1'), p('privacy.who.p2')] },
  { title: 'privacy.account.title', blocks: [p('privacy.account.p1'), p('privacy.account.p2'), p('privacy.account.p3')] },
  // The block in the middle is the one of the network page, from the same component and the same copy keys.
  { title: 'privacy.shared.title', blocks: [p('privacy.shared.p1'), { kind: 'shares' }, p('privacy.shared.p2'), p('privacy.shared.p3')] },
  {
    title: 'privacy.keeps.title',
    blocks: [p('privacy.keeps.intro'), list('privacy.keeps.i1', 'privacy.keeps.i2', 'privacy.keeps.i3', 'privacy.keeps.i4', 'privacy.keeps.i5')],
  },
  {
    title: 'privacy.cookies.title',
    blocks: [
      p('privacy.cookies.intro'),
      list(
        'privacy.cookies.c1', 'privacy.cookies.c2', 'privacy.cookies.c3', 'privacy.cookies.c4', 'privacy.cookies.c5', 'privacy.cookies.c6',
        'privacy.cookies.c7', 'privacy.cookies.l1', 'privacy.cookies.l2', 'privacy.cookies.l3', 'privacy.cookies.l4',
      ),
    ],
  },
  {
    title: 'privacy.services.title',
    blocks: [p('privacy.services.intro'), list('privacy.services.s1', 'privacy.services.s2', 'privacy.services.s3', 'privacy.services.s4'), p('privacy.services.p2')],
  },
  { title: 'privacy.delete.title', blocks: [p('privacy.delete.p1'), p('privacy.delete.p2'), p('privacy.delete.p3')] },
  { title: 'privacy.rights.title', blocks: [p('privacy.rights.p1')] },
  { title: 'privacy.children.title', blocks: [p('privacy.children.p1')] },
  { title: 'privacy.contact.title', blocks: [p('privacy.contact.p1')] },
];

/** The short passport notice of the three sites (3 to 5 lines). Not shown on any page of this lot. */
export const PRIVACY_NOTICE: readonly PrivacyKey[] = [
  'privacy.notice.l1', 'privacy.notice.l2', 'privacy.notice.l3', 'privacy.notice.l4', 'privacy.notice.l5',
];
