// Run O1 contract o1-contract-v1: the network layer's names and shapes (docs/o1/contracts/apis.md section 4,
// rpcs.md section 3, naming.md). Types and constants only. Nothing on the kpop path imports this module until
// B6 wires lib/network; the implementations (B6: eligibility.ts, links.ts, NetLink, via-catcher, /api/n/*; X1:
// crossovers.ts, CrossoverFact) satisfy the signature types below, e.g.
// `export const editorialHref: NetLinkFns['editorialHref'] = ...`.
//
// Naming (naming.md): the Net prefix for every network name. The word for a cross-site link survives only inside
// the frozen names NetBridgeId, bridgeHref (and its `bridge` parameter, BACKLOG 5.1) and the `bridge` field of the
// beacon body; the list of NetBridgeId values is therefore NET_LINK_IDS, and NetLink's prop is `linkId`.

import type { ReactNode } from 'react';

import type { SiteId, SiteLetter } from '../site/types';

/** A `via` code: the source site's letter, a dot, 2 to 8 lowercase letters (BACKLOG 5.1, cookies.md 1). */
export const VIA_RE = /^[kaf]\.[a-z]{2,8}$/;

/** A `via` code as the app builds it (`k.menu`, `a.ch`). Stored values are checked with VIA_RE only. */
export type ViaCode = `${SiteLetter}.${string}`;

/**
 * Every NetBridgeId value (Q 2.3), in Q's order, with its catalogue entry. A new value is a CR (BACKLOG 5.2) and
 * must match `^[a-z]{2,8}$` (the `bridge_daily.bridge` check). Day-1 links use foot, net, menu, welcome, xfact,
 * xhub, xpl, xres, team, about, wl and ch; the others are reserved for later links and render nowhere in the run.
 */
export const NET_LINK_IDS = [
  'foot', // B01 network footer line
  'net', // B02 umbrella network page
  'dir', // B03 umbrella directory
  'srch', // B04 umbrella search
  'zsrch', // B05 zero-result intent line
  'menu', // B06 "Your sites" in the account menu
  'pp', // B07 passport page stamps
  'stamp', // B08 friend stamps on profiles
  'welcome', // B09 welcome card (pending CR-002 and CR-006)
  'xfact', // B13 crossover fact line or tag
  'xhub', // B13 crossover fact line on a kpop group hub
  'xpl', // B12 crossover playlist
  'xres', // B14 end-of-run crossover row
  'webtoon', // B15 webtoon to anime hub
  'season', // B16 seasonal crossover moments
  'team', // B17 Team launch article
  'about', // B17 About page mention
  'wl', // B18 waitlist email
  'ch', // B19 challenge link
  'dch', // B20 direct cross-site challenge
  'fnotif', // B21 friend notification
  'live', // B22 shared live room
  'cup', // B23 Crossover Cup
  'digest', // B24 weekly digest
  'wrap', // B25 Year in Fandom
] as const;

/** The frozen id of a cross-site link (BACKLOG 5.1: "NetBridgeId = Q's list"). */
export type NetBridgeId = (typeof NET_LINK_IDS)[number];

/** The funnel steps of `bridge_daily.step` (schema.sql 005), in funnel order. */
export const NET_STEPS = ['shown', 'click', 'land', 'join', 'first_play', 'dismiss', 'optin'] as const;
export type NetStep = (typeof NET_STEPS)[number];

/**
 * The steps a browser sends to `POST /api/n/b` (apis.md 4.2, F0 decision 62). `join` and `first_play` are
 * counted by the server where they happen (net_bridge_bump with the service role), never by a beacon, and
 * `/auth/passport/out` counts nothing (the click beacon of NetLink is the only click counter).
 */
export const NET_BEACON_STEPS = ['shown', 'click', 'land', 'dismiss', 'optin'] as const;
export type NetBeaconStep = (typeof NET_BEACON_STEPS)[number];

/**
 * Body of `POST /api/n/b` (BACKLOG 5.1: `{dst, bridge, step}`), JSON or the text body of `navigator.sendBeacon`.
 * The server takes its own site from `SITE.id` and `signed_in` from the session. `dst` always names the other site
 * of the pair: the target for shown, click, dismiss and optin (sent on the source site), the source for land (sent
 * by via-catcher on the target site, read from the via letter); the row is (src, dst) = (SITE.id, dst) for the
 * first four and (dst, SITE.id) for land (F0 decision 62).
 */
export interface NetBeacon {
  readonly dst: SiteId;
  readonly bridge: NetBridgeId;
  readonly step: NetBeaconStep;
}

/** A visitor's stated choice for a site (`passport_prefs.worlds` values, P 3.1 and W4). */
export type NetSiteChoice = 'yes' | 'no';

/** How the "Your sites" menu shows (`passport_prefs.your_sites_menu`). */
export type NetSitesMenuMode = 'auto' | 'show' | 'hide';

/** One membership of the viewer, as `GET /api/n/me` returns it (BACKLOG 5.1). */
export interface NetSiteStamp {
  readonly id: SiteId;
  /** The viewer's level on that site: `getLevelInfo(xp, id).level` (kpop xp from profiles, P 7.3). */
  readonly level: number;
  /** The viewer's plays on that site (`my_passport().plays`, rpcs.md 2). */
  readonly plays: number;
  /** ISO timestamp of `world_memberships.joined_at`. */
  readonly joinedAt: string;
  /** `world_memberships.activated_at` is set (first play, create or follow on that site). */
  readonly activated: boolean;
}

/**
 * `GET /api/n/me`: the signed-in viewer's own network state, never anyone else's (BACKLOG 5.1, Q 2.3 adapted to
 * one `passport_prefs` table, BACKLOG 8 rows 9 and 10). Private, `Cache-Control: private, no-store`; 401 for a guest.
 */
export interface NetMe {
  /** Every membership of the viewer, in SITE_IDS order. */
  readonly sites: readonly NetSiteStamp[];
  /** `passport_prefs.worlds`: the sites the viewer said yes or no to; a missing key means no answer. */
  readonly worlds: Readonly<Partial<Record<SiteId, NetSiteChoice>>>;
  /** `passport_prefs.crossover_suggestions`: false turns every interactive cross-site link off. */
  readonly suggestions: boolean;
  /** `passport_prefs.dismissed`: ISO "until" per link id ("Not interested", 90 days). */
  readonly dismissed: Readonly<Partial<Record<NetBridgeId, string>>>;
  /** `passport_prefs.welcomed_sites`: the sites whose welcome was shown or skipped. */
  readonly welcomed: readonly SiteId[];
  /** `passport_prefs.your_sites_menu`. */
  readonly yourSitesMenu: NetSitesMenuMode;
}

/** Frequency caps of interactive cross-site links (Q 2.4), counted per browser in `fq.net.caps.v1` (cookies.md 7). */
export const NET_CAPS = {
  /** Interactive links per page view (crossover facts do not count). */
  perPage: 1,
  /** Interactive link impressions per day and per ISO week. */
  perDay: 3,
  perWeek: 10,
  /** Days a link id stays hidden after "Not interested". */
  dismissDays: 90,
  /** After this many dismissals of any kind every interactive link is off until Settings turns them back on. */
  dismissalsOff: 3,
} as const;

/** The counters `canShow` reads (the value of `fq.net.caps.v1` for this tab and page). */
export interface NetCapState {
  readonly pageShown: number;
  readonly today: number;
  readonly week: number;
  readonly dismissals: number;
}

/**
 * The signatures of B6's `lib/network/eligibility.ts` (BACKLOG 5.1 "Server module contracts"). B6 writes
 * `export const eligibleFor: NetEligibilityFns['eligibleFor'] = ...` (one interface keyed by the frozen function
 * names, so no new identifier carries a naming trap).
 */
export interface NetEligibilityFns {
  /**
   * Q 2.3, adapted: false without `me` or with `suggestions` false; false when `worlds[dst]` is 'no' (a "no" beats
   * a membership); true when `worlds[dst]` is 'yes' (no membership needed) or the viewer has a membership on `dst`
   * with `plays > 0`; false otherwise. Never true for `dst === SITE.id`.
   */
  eligibleFor(me: NetMe | null, dst: SiteId): boolean;
  /**
   * `eligibleFor(me, dst)`, the link id `id` not dismissed until a later time than `now`, `caps.dismissals <
   * NET_CAPS.dismissalsOff`, `caps.pageShown < perPage`, `caps.today < perDay`, `caps.week < perWeek`.
   */
  canShow(me: NetMe | null, dst: SiteId, id: NetBridgeId, caps: NetCapState, now?: number): boolean;
}

/** The signatures of B6's `lib/network/links.ts` (BACKLOG 5.1, Q 2.5). */
export interface NetLinkFns {
  /**
   * A signed-in UI link: the same-origin `/auth/passport/out?to=<dst>&next=<path>&via=<SITE letter>.<id>`
   * (apis.md 2.1); `path` is a site-relative path of `dst`. Never an absolute URL, never a token.
   */
  bridgeHref(dst: SiteId, path: string, bridge: NetBridgeId): string;
  /** An editorial (followed, crawlable) link: `REGISTRY[dst].url + path`, no query. */
  editorialHref(dst: SiteId, path: string): string;
}

/**
 * Props of `NetLink` (B6, `components/network/`): a plain `<a>` (never next/link, so nothing is prefetched across
 * sites), same tab. `editorial` true: `editorialHref`, followed, no query (allowed only where link-allowlist.md
 * lists it). Otherwise `bridgeHref` with `rel="nofollow"`, rendered only in a client island after `/api/n/me`
 * answered and `canShow` passed. With NEXT_PUBLIC_NET_BEACON on it sends one `shown` beacon when it enters the
 * viewport and a `click` beacon on click.
 */
export interface NetLinkProps {
  readonly dst: SiteId;
  readonly path: string;
  /** The link id: the `via` code's second part and the beacon's id. */
  readonly linkId: NetBridgeId;
  readonly editorial?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/** The kinds of crossover entries (Q D5). */
export type NetCrossoverKind = 'song_in_series' | 'webtoon_origin' | 'animated_crossover';

/**
 * One entry of X1's `lib/network/crossovers.ts` (Q D5; the JSON Schema of the "crossover entry" format follows this
 * shape, formats.md). F0 decision: `anime.role` uses the `series_themes.kind` values (lowercase).
 */
export interface NetCrossover {
  /** `^[a-z0-9-]{3,60}$`, stable, e.g. 'skz-top-tog-2020'. */
  readonly id: string;
  readonly kind: NetCrossoverKind;
  readonly kpop: { readonly groupSlug?: string; readonly deezerId?: number; readonly mbid?: string };
  readonly anime: {
    readonly seriesSlug: string;
    readonly role?: 'op' | 'ed' | 'insert';
    readonly season?: string;
    readonly cour?: number;
    readonly year: number;
  };
  /** The site that hosts the canonical copy of the crossover content. */
  readonly canonical: 'kpop' | 'anime';
  /** One sentence per side, at most 140 characters, no dash characters. */
  readonly fact: { readonly kpop: string; readonly anime: string };
  /** An https source: official site, label, agency, or Wikipedia citing one. */
  readonly source: string;
  /** YYYY-MM-DD of the human check. */
  readonly checkedOn: string;
  readonly status: 'verified' | 'hold';
}

/**
 * Props of `CrossoverFact` (X1, `components/network/crossover-fact.tsx`): the fact text renders on the server;
 * the cross-site link is a client island (`CrossoverLink`) shown when `canShow` passes. Only `verified` entries
 * render; nothing renders with NEXT_PUBLIC_NET_FACTS off.
 */
export interface CrossoverFactProps {
  readonly crossover: NetCrossover;
  readonly side: 'kpop' | 'anime';
  readonly variant: 'tag' | 'line' | 'credit';
}
