// Bunnyverse Cards, lane B: the ads layer, pure part (no React, no window): the context of a request, the tag attributes, the consent rule and the
// rewarded flow. Hub only (NET_CARDS_ADS + NEXT_PUBLIC_NET_CARDS_ADS, both off by default); kpopquiz.org never loads an ad script. Missing publisher id
// or slot id (owner decision 8): nothing loads and the button stays hidden.
// Launch polish (lane ADS, integrator and owner 2026-11-20): the publisher id is NEXT_PUBLIC_ADSENSE_PUB_ID (lib/site/adsense.ts, the same variable as the
// verification tag and /ads.txt); no blanket child or teen tagging (the old US and unknown-country rule is gone): a request is tagged under age only for
// a player the site KNOWS to be under 18, and a request is personalised only when Google's consent message says yes (see adPersonalisation).
//
// Google documentation read (developers.google.com/ad-placement, the Ad Placement API of H5 Games Ads):
//   /apis/adbreak   adBreak({ type: 'reward', name, beforeReward(showAdFn), adViewed(), adDismissed(), afterAd(), adBreakDone(placementInfo) });
//                   breakStatus: notReady, timeout, invalid, error, noAdPreloaded, frequencyCapped, ignored, other, dismissed, viewed.
//   /apis/adconfig  adConfig({ preloadAdBreaks: 'on' | 'auto', sound: 'on' | 'off', onReady() }); preloadAdBreaks can be set once.
//   /docs/preload-ads  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous">
// NOT confirmed by a page I could fetch (404 on the guessed pages): the exact data attribute that marks ad requests as for a user under the age of
// consent, the test-mode attribute and the CMP script address. They are isolated in the three constants below for the owner to check against his AdSense
// console.

import { parseAdsenseAccount } from '@/lib/site/adsense';

export const AD_SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
/** Unconfirmed attribute names (see above). One place to change. */
export const ATTR_UNDER_AGE = 'data-tag-for-under-age-of-consent';
export const ATTR_TEST = 'data-adbreak-test';
/** Documented AdSense attribute: with no consent signal at all the request is non personalised. */
export const ATTR_NPA_UNKNOWN = 'data-npa-on-unknown-consent';
export const CMP_BASE = 'https://fundingchoicesmessages.google.com/i/';
/** The three values the owner checks against his AdSense console before NET_CARDS_ADS goes on (review 1 finding 14, docs/o1/requests/CARDS.md). */
export const UNCONFIRMED_FOR_OWNER: readonly string[] = [ATTR_UNDER_AGE, ATTR_TEST, CMP_BASE];

export const SLOT_RE = /^\d{6,20}$/;

/** EEA (EU 27, Iceland, Liechtenstein, Norway), the UK and Switzerland: the consent message applies. */
export const CONSENT_COUNTRIES: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
];

/** The web providers of a rewarded ad. 'adsense' (the Ad Placement API, adBreak of type reward) has no server callback: the grant is the ticket claim of
 *  /api/cards/ad/claim. 'applixir' (later) has a signed callback: its path is the SSV route of LAUNCH-PREP (/api/cards/ad/ssv, NET_CARDS_AD_PACKS, off), and
 *  the web claim path refuses it. */
export type AdProviderId = 'adsense' | 'applixir';
export const AD_PROVIDER_PATH: Readonly<Record<AdProviderId, 'claim' | 'ssv'>> = { adsense: 'claim', applixir: 'ssv' };
export const adProviderOf = (raw: string | undefined): AdProviderId => (raw === 'applixir' ? 'applixir' : 'adsense');

/** Seconds an ad needs at least: a claim made sooner than this after the ticket was issued is refused (CARDS_AD_MIN_SECONDS, default 15, from 5 to 120).
 *  A rewarded video of Google runs 15 to 30 seconds and can be skipped only after its reward point; 15 s is the shortest one. */
export const AD_MIN_SECONDS_DEFAULT = 15;
export function adMinSeconds(raw: string | undefined): number {
  if (raw === undefined || !/^\s*\d{1,3}\s*$/.test(raw)) return AD_MIN_SECONDS_DEFAULT;
  return Math.min(120, Math.max(5, Number(raw)));
}

/** What the screen before each ad says (the player chooses to watch: Google's rewarded rule) and where its odds link goes. */
export const AD_INTRO_TITLE = 'Watch an ad, get 1 pack';
export const AD_INTRO_ODDS_PATH = '/kpopcards/odds';

export interface AdsContext {
  /** False: nothing loads, the button and the banner stay hidden. */
  enabled: boolean;
  client: string | null;
  bannerSlot: string | null;
  country: string | null;
  /** The site KNOWS this player is under 18 (the request is tagged under age and never personalised). The site holds no age today: always false. */
  knownMinor: boolean;
  consentRequired: boolean;
  test: boolean;
}

export interface AdsEnv {
  NET_CARDS_ADS?: string | undefined;
  NEXT_PUBLIC_NET_CARDS_ADS?: string | undefined;
  NEXT_PUBLIC_ADSENSE_PUB_ID?: string | undefined;
  NEXT_PUBLIC_CARDS_BANNER_SLOT?: string | undefined;
  NEXT_PUBLIC_CARDS_ADS_TEST?: string | undefined;
}

const on = (v: string | undefined): boolean => v === '1' || v === 'true';

export function normalizeCountry(raw: string | null | undefined): string | null {
  const c = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

/** A player the site knows to be under 18, from an age in whole years the site holds (never a birth date here). Unknown age: not a known minor. */
export const isKnownMinor = (ageYears: number | null | undefined): boolean => typeof ageYears === 'number' && Number.isFinite(ageYears) && ageYears >= 0 && ageYears < 18;
/** Unknown country counts as a consent region (fail closed). */
export const consentRequired = (country: string | null): boolean => country === null || CONSENT_COUNTRIES.includes(country);

/** Decided on the server from the platform's country header (`x-vercel-ip-country`). */
export function adsContext(env: AdsEnv, countryHeader: string | null | undefined, site: string, opts: { knownMinor?: boolean } = {}): AdsContext {
  const country = normalizeCountry(countryHeader);
  const client = parseAdsenseAccount(env.NEXT_PUBLIC_ADSENSE_PUB_ID)?.client ?? null;
  const slot = SLOT_RE.test(env.NEXT_PUBLIC_CARDS_BANNER_SLOT ?? '') ? env.NEXT_PUBLIC_CARDS_BANNER_SLOT! : null;
  return {
    enabled: site === 'hub' && on(env.NET_CARDS_ADS) && on(env.NEXT_PUBLIC_NET_CARDS_ADS) && client !== null,
    client,
    bannerSlot: slot,
    country,
    knownMinor: opts.knownMinor === true,
    consentRequired: consentRequired(country),
    test: on(env.NEXT_PUBLIC_CARDS_ADS_TEST),
  };
}

/** The attributes of the ad script tag, or null when ads are off (then no tag is written). */
export function scriptAttributes(ctx: AdsContext): Record<string, string> | null {
  if (!ctx.enabled || !ctx.client) return null;
  const a: Record<string, string> = { src: `${AD_SCRIPT_BASE}?client=${ctx.client}`, crossorigin: 'anonymous', 'data-ad-client': ctx.client, [ATTR_NPA_UNKNOWN]: 'true' };
  if (ctx.knownMinor) a[ATTR_UNDER_AGE] = '1';
  if (ctx.test) a[ATTR_TEST] = 'on';
  return a;
}

/** The address of Google's certified CMP (Funding Choices) for this publisher, or null. */
export function cmpSrc(ctx: AdsContext): string | null {
  if (!ctx.enabled || !ctx.client) return null;
  return `${CMP_BASE}${ctx.client.replace(/^ca-/, '')}?ers=1`;
}

/** The slice of the IAB TCF v2 `tcData` this layer reads. */
export interface TcData { gdprApplies?: boolean; eventStatus?: string; purpose?: { consents?: Record<string, boolean> } }

/** May an ad request go out? Outside the consent regions always; inside, only once the CMP says the user answered and agreed to purpose 1. */
export function consentAllows(ctx: AdsContext, tc: TcData | null): boolean {
  if (!ctx.consentRequired) return true;
  if (!tc) return false;
  if (tc.gdprApplies === false) return true;
  const done = tc.eventStatus === 'tcloaded' || tc.eventStatus === 'useractioncomplete';
  return done && tc.purpose?.consents?.['1'] === true;
}

export type AdPersonalisation = 'personalised' | 'non_personalised';

/**
 * One rule for every request (owner, 2026-11-20): PERSONALISED only when Google's consent message (the one consent tool, TCF) says the visitor agreed to
 * the purposes personalised ads need (1 store and access, 3 create a personalised ads profile, 4 select personalised ads) and the site does not know the
 * player to be under 18. Everything else is NON personalised: no answer yet, a refusal, a partial answer, a visitor outside the consent regions that was
 * never asked, a known minor. Never the other way round.
 */
export function adPersonalisation(tc: TcData | null, opts: { knownMinor?: boolean } = {}): AdPersonalisation {
  if (opts.knownMinor === true || !tc) return 'non_personalised';
  const done = tc.eventStatus === 'tcloaded' || tc.eventStatus === 'useractioncomplete';
  const c = tc.purpose?.consents ?? {};
  return done && c['1'] === true && c['3'] === true && c['4'] === true ? 'personalised' : 'non_personalised';
}

// ---- the rewarded flow ------------------------------------------------------------------------------------------------------------------------

export interface PlacementInfo { breakStatus?: string }
export interface RewardBreak {
  type: 'reward';
  name: string;
  beforeReward: (showAdFn: () => void) => void;
  adViewed: () => void;
  adDismissed: () => void;
  adBreakDone: (info: PlacementInfo) => void;
}
export type AdBreakFn = (o: RewardBreak) => void;
export type RewardState = 'hidden' | 'ready' | 'busy';

export interface RewardDeps {
  adBreak: AdBreakFn;
  /** POST /api/cards/ad/ticket: the ticket, or null on `limit` / `disabled` / any error. */
  ticket: () => Promise<string | null>;
  /** POST /api/cards/ad/claim { ticket }: called ONLY from adViewed. */
  grant: (ticket: string) => Promise<void>;
  onState: (s: RewardState) => void;
}

/**
 * probe(): ask Google for a rewarded ad; the button shows only if `beforeReward` fires (an ad is available). The probe never shows an ad. agree() is the
 * player's yes on the screen that says "Watch an ad, get 1 pack": it is valid for ONE ad. click(): without that yes it does nothing at all (no ticket, no ad,
 * never an automatic start); with it, ticket first, then show the ad. The grant call is made in `adViewed` and nowhere else, so a dismissed ad grants nothing.
 */
export function createRewardController(d: RewardDeps): { probe: () => void; agree: () => void; click: () => Promise<void> } {
  let show: (() => void) | null = null;
  let busy = false;
  let agreed = false;
  let ticket: string | null = null;
  const probe = (): void => {
    show = null;
    let offered = false;
    try {
      d.adBreak({
        type: 'reward',
        name: 'cards-pack',
        beforeReward: (fn) => { offered = true; show = fn; d.onState('ready'); },
        adViewed: () => {
          const t = ticket;
          ticket = null;
          if (!t) return;
          void d.grant(t).catch(() => undefined);
        },
        adDismissed: () => { ticket = null; },
        adBreakDone: () => {
          // Never offered (no ad available, capped, not ready): hide. Offered and then shown or dismissed: look for the next one.
          if (!offered) { busy = false; d.onState('hidden'); return; }
          if (show === null && ticket === null) { busy = false; probe(); }
        },
      });
    } catch {
      d.onState('hidden');
    }
  };
  const agree = (): void => { agreed = true; };
  const click = async (): Promise<void> => {
    if (!agreed) return;
    agreed = false;
    if (busy || !show) return;
    busy = true;
    d.onState('busy');
    const t = await d.ticket().catch(() => null);
    if (!t) { busy = false; d.onState('hidden'); return; }
    ticket = t;
    const fn = show;
    show = null;
    try { fn(); } catch { ticket = null; busy = false; d.onState('hidden'); }
  };
  return { probe, agree, click };
}
