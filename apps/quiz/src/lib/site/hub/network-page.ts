// Run O1, lot (d), lane H1: the data of the network page (fandomverse.org, /). Pure: the sites come from the registry,
// the words of a card from the vocabulary of its site, the link from netOrigin (the registry url on production). No
// origin or site name is written here.

import { ht } from '@/lib/site/hub/copy';
import { netOrigin, NETWORK, REGISTRY, SITE_ID } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { COPY as H1 } from '@/copy/hub/h1';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { AuthProvider, SiteId } from '@/lib/site/types';

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
// The privacy page: its keys in reading order. The page (components/hub/hub-privacy.tsx) renders this list and nothing else, so a
// key that is not listed here is not on the page. Owner's answers of 2026-10-24: docs/o1/briefs/H1-privacy.md.

/** One block of a section: a paragraph, a bullet list, the sign-in methods of the sites, the pointer to the legal notice, or the "What your passport shares" block. */
export type PrivacyBlock =
  | { readonly kind: 'p'; readonly key: PrivacyKey }
  | { readonly kind: 'list'; readonly keys: readonly PrivacyKey[] }
  | { readonly kind: 'signins' }
  | { readonly kind: 'legal'; readonly key: PrivacyKey; readonly link: PrivacyKey }
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

/** The data controller line: one key (Louis Pecchia, entrepreneur individuel; owner, 2026-10-25). */
export const PRIVACY_CONTROLLER = 'privacy.controller' as const satisfies PrivacyKey;

const p = (key: PrivacyKey): PrivacyBlock => ({ kind: 'p', key });
const list = (...keys: PrivacyKey[]): PrivacyBlock => ({ kind: 'list', keys });

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  { title: 'privacy.who.title', blocks: [p('privacy.who.p1'), p('privacy.who.p2'), p('privacy.who.p3'), p(PRIVACY_CONTROLLER), { kind: 'legal', key: 'privacy.who.legal', link: 'privacy.who.legalLink' }] },
  { title: 'privacy.account.title', blocks: [p('privacy.account.intro'), { kind: 'signins' }, p('privacy.account.p1'), p('privacy.account.p2')] },
  // The block in the middle is the one of the network page, from the same component and the same copy keys.
  { title: 'privacy.shared.title', blocks: [p('privacy.shared.p1'), { kind: 'shares' }, p('privacy.shared.p2'), p('privacy.shared.p3')] },
  {
    title: 'privacy.keeps.title',
    blocks: [
      p('privacy.keeps.intro'),
      list('privacy.keeps.i1', 'privacy.keeps.i2', 'privacy.keeps.i3', 'privacy.keeps.i4', 'privacy.keeps.i5'),
      p('privacy.keeps.kpop'),
    ],
  },
  { title: 'privacy.audience.title', blocks: [p('privacy.audience.p1'), p('privacy.audience.p2')] },
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
    blocks: [
      p('privacy.services.intro'),
      list('privacy.services.s1', 'privacy.services.s2', 'privacy.services.s3', 'privacy.services.s4', 'privacy.services.s5'),
      p('privacy.services.p2'),
      p('privacy.services.p3'),
      p('privacy.services.p4'),
    ],
  },
  { title: 'privacy.delete.title', blocks: [p('privacy.delete.p1'), p('privacy.delete.p2'), p('privacy.delete.p3'), p('privacy.delete.p4'), p('privacy.delete.p5')] },
  { title: 'privacy.retention.title', blocks: [p('privacy.retention.p1'), p('privacy.retention.p2')] },
  { title: 'privacy.rights.title', blocks: [p('privacy.rights.p1'), p('privacy.rights.p2'), p('privacy.rights.p3')] },
  { title: 'privacy.children.title', blocks: [p('privacy.children.p1')] },
  { title: 'privacy.law.title', blocks: [p('privacy.law.p1'), p('privacy.law.p2')] },
  { title: 'privacy.contact.title', blocks: [p('privacy.contact.p1')] },
];

const PROVIDER_KEY = {
  google: 'privacy.account.google',
  discord: 'privacy.account.discord',
  email: 'privacy.account.email',
} as const satisfies Record<AuthProvider, PrivacyKey>;

/** One line per site: how you sign in there, from the registry ("KpopQuiz: Google, Discord or an email link"). */
export function signInItems(): { readonly id: SiteId; readonly text: string }[] {
  return SITE_IDS.map((id) => {
    const s = REGISTRY[id];
    const parts = s.auth.providers.map((provider) => ht(PROVIDER_KEY[provider]));
    const methods = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ${ht('privacy.account.or')} ${parts[parts.length - 1]}` : (parts[0] ?? '');
    return { id, text: `${s.brand.name}: ${methods}` };
  });
}

/**
 * The short passport notice of the sign-in sheet and the login page of the three sites: three lines, then a link to the full text.
 * It is the same copy as the policy (privacy.notice.*): no click is asked, it is plain text.
 */
export const PRIVACY_NOTICE: readonly PrivacyKey[] = ['privacy.notice.l1', 'privacy.notice.l2', 'privacy.notice.l3'];
export const PRIVACY_NOTICE_LINK = 'privacy.notice.link' as const satisfies PrivacyKey;
/** The same pointer as plain text, for a screen that cannot carry a link (the login page words). */
export const PRIVACY_NOTICE_FULL = 'privacy.notice.full' as const satisfies PrivacyKey;

/** The notice as one run of plain text: the three lines, then where the full text is. */
export function privacyNoticeText(): string {
  return [...PRIVACY_NOTICE.map((k) => ht(k)), ht(PRIVACY_NOTICE_FULL)].join(' ');
}

/** Where the full text lives: the network origin of the registry, /privacy. */
export function privacyUrl(): string {
  return `${NETWORK.url}/privacy`;
}

/**
 * The class prefix of the policy blocks. The anime build serves the same policy and reads only its own folder of site sheets, whose
 * rules may name only `anime-h1-*` classes (tokens.md 3.3 rule 6); the hub uses `hub-h1-*`. Same markup, one prefix per build.
 */
export const POLICY_CLASS: 'hub-h1' | 'anime-h1' = SITE_ID === 'anime' ? 'anime-h1' : 'hub-h1';

// ---------------------------------------------------------------------------------------------------------------------------
// The legal notice (mentions légales, /legal): its keys in reading order. The page (app/(site)/legal/page.tsx) prints each of them once
// and nothing else. LEGAL_PLACEHOLDER_KEYS holds the one fact the owner has not given yet (the phone), written once, as a [BRACKETED] line.

export type LegalKey = Extract<keyof typeof H1, `legal.${string}`>;

export const LEGAL_PLACEHOLDER_KEYS = ['legal.phone'] as const satisfies readonly LegalKey[];

export const LEGAL_KEYS: readonly LegalKey[] = [
  'legal.metaTitle', 'legal.metaDescription', 'legal.h1', 'legal.sub', 'legal.lede',
  'legal.publisher.title', 'legal.publisher.p1', 'legal.publisher', 'legal.publisher.formLabel', 'legal.form', 'legal.siren', 'legal.vat',
  'legal.publisher.phoneLabel', 'legal.phone', 'legal.publisher.emailLabel',
  'legal.director.title', 'legal.director.p1', 'legal.director',
  'legal.host.title', 'legal.host.p1', 'legal.host.name', 'legal.host.address', 'legal.host.phoneLabel', 'legal.host.phone',
  'legal.data.title', 'legal.data.p1', 'legal.data.link',
];
