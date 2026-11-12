// Bunnyverse Cards, lane B: the ads layer, pure part (no React, no window): the context of a request, the tag attributes, the consent rule and the
// rewarded flow. Hub only (NET_CARDS_ADS + NEXT_PUBLIC_NET_CARDS_ADS, both off by default); kpopquiz.org never loads an ad script. Missing publisher id
// or slot id (owner decision 8): nothing loads and the button stays hidden.
//
// Google documentation read (developers.google.com/ad-placement, the Ad Placement API of H5 Games Ads):
//   /apis/adbreak   adBreak({ type: 'reward', name, beforeReward(showAdFn), adViewed(), adDismissed(), afterAd(), adBreakDone(placementInfo) });
//                   breakStatus: notReady, timeout, invalid, error, noAdPreloaded, frequencyCapped, ignored, other, dismissed, viewed.
//   /apis/adconfig  adConfig({ preloadAdBreaks: 'on' | 'auto', sound: 'on' | 'off', onReady() }); preloadAdBreaks can be set once.
//   /docs/preload-ads  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous">
// NOT confirmed by a page I could fetch (404 on the guessed pages): the exact data attribute that marks ad requests child-directed, the test-mode
// attribute and the CMP script address. They are isolated in the three constants below for the owner to check against his AdSense console.

export const AD_SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
/** Unconfirmed attribute names (see above). One place to change. */
export const ATTR_CHILD_DIRECTED = 'data-tag-for-child-directed-treatment';
export const ATTR_TEST = 'data-adbreak-test';
export const CMP_BASE = 'https://fundingchoicesmessages.google.com/i/';
/** The three values the owner checks against his AdSense console before NET_CARDS_ADS goes on (review 1 finding 14, docs/o1/requests/CARDS.md). */
export const UNCONFIRMED_FOR_OWNER: readonly string[] = [ATTR_CHILD_DIRECTED, ATTR_TEST, CMP_BASE];

export const PUBLISHER_RE = /^ca-pub-\d{10,20}$/;
export const SLOT_RE = /^\d{6,20}$/;

/** EEA (EU 27, Iceland, Liechtenstein, Norway), the UK and Switzerland: the consent message applies. */
export const CONSENT_COUNTRIES: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
];

export interface AdsContext {
  /** False: nothing loads, the button and the banner stay hidden. */
  enabled: boolean;
  client: string | null;
  bannerSlot: string | null;
  country: string | null;
  childDirected: boolean;
  consentRequired: boolean;
  test: boolean;
}

export interface AdsEnv {
  NET_CARDS_ADS?: string | undefined;
  NEXT_PUBLIC_NET_CARDS_ADS?: string | undefined;
  NEXT_PUBLIC_CARDS_ADSENSE_CLIENT?: string | undefined;
  NEXT_PUBLIC_CARDS_BANNER_SLOT?: string | undefined;
  NEXT_PUBLIC_CARDS_ADS_TEST?: string | undefined;
}

const on = (v: string | undefined): boolean => v === '1' || v === 'true';

export function normalizeCountry(raw: string | null | undefined): string | null {
  const c = (raw ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

/** US visitors: ad requests are marked child-directed (plan v3, no age question). An unknown country counts as the US (fail closed, review 1
 *  finding 14): a request that cannot be placed is marked child-directed. */
export const isChildDirected = (country: string | null): boolean => country === null || country === 'US';
/** Unknown country counts as a consent region (fail closed). */
export const consentRequired = (country: string | null): boolean => country === null || CONSENT_COUNTRIES.includes(country);

/** Decided on the server from the platform's country header (`x-vercel-ip-country`). */
export function adsContext(env: AdsEnv, countryHeader: string | null | undefined, site: string): AdsContext {
  const country = normalizeCountry(countryHeader);
  const client = PUBLISHER_RE.test(env.NEXT_PUBLIC_CARDS_ADSENSE_CLIENT ?? '') ? env.NEXT_PUBLIC_CARDS_ADSENSE_CLIENT! : null;
  const slot = SLOT_RE.test(env.NEXT_PUBLIC_CARDS_BANNER_SLOT ?? '') ? env.NEXT_PUBLIC_CARDS_BANNER_SLOT! : null;
  return {
    enabled: site === 'hub' && on(env.NET_CARDS_ADS) && on(env.NEXT_PUBLIC_NET_CARDS_ADS) && client !== null,
    client,
    bannerSlot: slot,
    country,
    childDirected: isChildDirected(country),
    consentRequired: consentRequired(country),
    test: on(env.NEXT_PUBLIC_CARDS_ADS_TEST),
  };
}

/** The attributes of the ad script tag, or null when ads are off (then no tag is written). */
export function scriptAttributes(ctx: AdsContext): Record<string, string> | null {
  if (!ctx.enabled || !ctx.client) return null;
  const a: Record<string, string> = { src: `${AD_SCRIPT_BASE}?client=${ctx.client}`, crossorigin: 'anonymous', 'data-ad-client': ctx.client };
  if (ctx.childDirected) a[ATTR_CHILD_DIRECTED] = '1';
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
  /** POST /api/cards/ad/grant { ticket }: called ONLY from adViewed. */
  grant: (ticket: string) => Promise<void>;
  onState: (s: RewardState) => void;
}

/**
 * probe(): ask Google for a rewarded ad; the button shows only if `beforeReward` fires (an ad is available). A probe that ends with
 * `adBreakDone` and no `beforeReward` hides the button. click(): ticket first, then show the ad; the grant call is made in `adViewed` and nowhere
 * else, so a dismissed ad grants nothing.
 */
export function createRewardController(d: RewardDeps): { probe: () => void; click: () => Promise<void> } {
  let show: (() => void) | null = null;
  let busy = false;
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
  const click = async (): Promise<void> => {
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
  return { probe, click };
}
