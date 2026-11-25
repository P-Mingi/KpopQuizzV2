// UX v11 navigation model (DESIGN-SPEC 16.5 + 17.1). Pure data + matchers so the
// server-rendered nav, the tab bar and the tests agree on one route map. Every
// item is a real <a href> (16.5): crawlers and keyboards see the real paths.

import { BURROW_PATHS, burrowOpen } from '@/lib/site/hub/daily-guess';
import { SITE, flagOn } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';
import { isUxV12 } from '@/lib/ux-v12';

import type { UxIconName } from './icons';

export type NavKey = 'home' | 'quizzes' | 'groups' | 'blindtest' | 'community' | 'leaderboard' | 'cards' | 'daily';
export type TabKey = 'home' | 'quizzes' | 'blindtest' | 'community' | 'you' | 'cards' | 'daily';

export interface NavItem<K extends string> {
  key: K;
  label: string;
  href: string;
  icon: UxIconName;
}

export const NAV_ITEMS: NavItem<NavKey>[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home' },
  { key: 'quizzes', label: 'Quizzes', href: '/quizzes', icon: 'layers' },
  { key: 'groups', label: 'Groups', href: '/groups', icon: 'users' },
  { key: 'blindtest', label: 'Blindtest', href: '/blindtest', icon: 'music' },
  { key: 'community', label: 'Community', href: '/community', icon: 'msg' },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: 'trophy' },
];

// Run O1: the top bar of another site names its own topic (Series) and shows only the doors the site has: the feature is on
// and the route map of the site knows the path. On kpop it is NAV_ITEMS itself, the same array, as today.
const NAV_FEATURE: Record<NavKey, keyof typeof SITE.features | null> = {
  home: null, quizzes: 'quizzes', groups: 'topicHubs', blindtest: 'blindTest', community: 'community', leaderboard: 'leaderboards', cards: null, daily: 'dailyGuess',
};

// The hub (home v3, 2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the tabs of its home on every hub page. Its sections live on
// the home, so the tabs lead there: Quizzes to Hot right now, Community to Top fans (owner, 2026-11-07: no Blind test tab; its player stays
// in Today on the home). The Burrow joins
// them with its pages and the dailyGuess flag (step 4 of the daily games).
const HUB_NAV: NavItem<NavKey>[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home' },
  { key: 'quizzes', label: 'Quizzes', href: '/#hot', icon: 'layers' },
  { key: 'community', label: 'Community', href: '/#community', icon: 'msg' },
];

// Bunnyverse Cards (lane U): the hub gets a Cards entry only with NEXT_PUBLIC_NET_CARDS on (the public twin of NET_CARDS: the navigation is client code, so a server flag would not match;
// docs/o1/requests/CARDS-U.md asks ORCH to register it); off, HUB_NAV itself (the same array) is returned.
const HUB_NAV_CARDS: NavItem<NavKey>[] = [...HUB_NAV, { key: 'cards', label: 'KpopCards', href: '/kpopcards', icon: 'layers' }];

// Owner request 2026-11-13 (the passport page lacked it): the Daily games tab of the hub home on every other hub page too, second like on
// the home, with the same badge (the games left on this device, components/layout/ux-v1/ux-daily-badge.tsx). Only while the Burrow is open
// (the dailyGuess feature on and its three pages served: lib/site/hub/daily-guess.ts burrowOpen), so a door never leads to a 404.
const HUB_DAILY: NavItem<NavKey> = { key: 'daily', label: 'Daily games', href: BURROW_PATHS.burrow, icon: 'grid' };
const withDaily = <K extends string>(items: NavItem<K>[], daily: NavItem<K>): NavItem<K>[] => [items[0]!, daily, ...items.slice(1)];
const HUB_NAV_DAILY = withDaily(HUB_NAV, HUB_DAILY);
const HUB_NAV_DAILY_CARDS = withDaily(HUB_NAV_CARDS, HUB_DAILY);

export function navItemsFor(site: typeof SITE = SITE): NavItem<NavKey>[] {
  if (site.id === 'kpop') return NAV_ITEMS;
  if (site.id === 'hub') {
    const cards = flagOn(process.env.NEXT_PUBLIC_NET_CARDS);
    if (burrowOpen(site.features)) return cards ? HUB_NAV_DAILY_CARDS : HUB_NAV_DAILY;
    return cards ? HUB_NAV_CARDS : HUB_NAV;
  }
  const topic = site.vocabulary.topicPlural;
  return NAV_ITEMS
    .map((it) => (it.key === 'groups' ? { ...it, label: topic.charAt(0).toUpperCase() + topic.slice(1), href: '/series' } : it))
    .filter((it) => {
      const f = NAV_FEATURE[it.key];
      return (f === null || site.features[f]) && isKnownRouteFor(site.id, it.href, { v1: true, v12: true });
    });
}

/**
 * Owner request 2026-11-25 (kpopquiz.org only): Groups is a sub-item of Quizzes and Leaderboard a sub-item of Community, each opening from its parent's
 * toggle in the top bar. Every URL stays; a path of a child lights its parent too (NavGroup in ux-nav-links.tsx). The other sites keep the flat bar of navItemsFor.
 * The phone tab bar already has neither (activeTab lights Quizzes for /groups and Community for /leaderboard), so it is unchanged.
 */
export const NAV_CHILDREN: Readonly<Partial<Record<NavKey, readonly NavKey[]>>> = { quizzes: ['groups'], community: ['leaderboard'] };

export interface NavNode extends NavItem<NavKey> {
  /** The sub-items of the item, in order; empty for an item with none (every item of the other sites). */
  children: NavItem<NavKey>[];
}

/** The top bar as a tree: on kpop, Quizzes holds Groups and Community holds Leaderboard; on any other site the flat list of navItemsFor, no children. */
export function navTreeFor(site: typeof SITE = SITE): NavNode[] {
  const items = navItemsFor(site);
  if (site.id !== 'kpop') return items.map((it) => ({ ...it, children: [] }));
  const byKey = new Map(items.map((it) => [it.key, it]));
  const nested = new Set<NavKey>(Object.values(NAV_CHILDREN).flat());
  return items
    .filter((it) => !nested.has(it.key))
    .map((it) => ({ ...it, children: (NAV_CHILDREN[it.key] ?? []).flatMap((k) => byKey.get(k) ?? []) }));
}

export const TAB_ITEMS: NavItem<TabKey>[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home' },
  { key: 'quizzes', label: 'Quizzes', href: '/quizzes', icon: 'layers' },
  { key: 'blindtest', label: 'Blindtest', href: '/blindtest', icon: 'music' },
  { key: 'community', label: 'Community', href: '/community', icon: 'users' },
  { key: 'you', label: 'You', href: '/profile', icon: 'user' },
];

// Run C1: the mobile tab bar of another site shows only the doors the site has, like the top bar above. On kpop it is TAB_ITEMS
// itself, the same array, as today. "You" goes to the site's own passport page: /me on anime, /passport on the hub.
const TAB_FEATURE: Record<TabKey, keyof typeof SITE.features | null> = {
  home: null, quizzes: 'quizzes', blindtest: 'blindTest', community: 'community', you: null, cards: null, daily: 'dailyGuess',
};
const YOU_HREF: Record<'anime' | 'hub', string> = { anime: '/me', hub: '/passport' };

const HUB_TABS: NavItem<TabKey>[] = [
  ...HUB_NAV.map((it) => ({ ...it, key: it.key as TabKey, icon: it.key === 'community' ? ('users' as const) : it.icon })),
  { key: 'you', label: 'You', href: YOU_HREF.hub, icon: 'user' },
];

// The tab bar is narrow: with six tabs "KpopCards" ran into "Community" (owner, 2026-11-22), so the tab reads "Cards" there, like "Daily" below.
const HUB_TABS_CARDS: NavItem<TabKey>[] = [...HUB_TABS.slice(0, -1), { key: 'cards', label: 'Cards', href: '/kpopcards', icon: 'layers' }, ...HUB_TABS.slice(-1)];
// The tab bar is narrow: the same door reads "Daily" there.
const HUB_TAB_DAILY: NavItem<TabKey> = { key: 'daily', label: 'Daily', href: BURROW_PATHS.burrow, icon: 'grid' };
const HUB_TABS_DAILY = withDaily(HUB_TABS, HUB_TAB_DAILY);
const HUB_TABS_DAILY_CARDS = withDaily(HUB_TABS_CARDS, HUB_TAB_DAILY);

export function tabItemsFor(site: typeof SITE = SITE): NavItem<TabKey>[] {
  if (site.id === 'kpop') return TAB_ITEMS;
  if (site.id === 'hub') {
    const cards = flagOn(process.env.NEXT_PUBLIC_NET_CARDS);
    if (burrowOpen(site.features)) return cards ? HUB_TABS_DAILY_CARDS : HUB_TABS_DAILY;
    return cards ? HUB_TABS_CARDS : HUB_TABS;
  }
  const id = site.id;
  return TAB_ITEMS
    .map((it) => (it.key === 'you' ? { ...it, href: YOU_HREF[id] } : it))
    .filter((it) => {
      const f = TAB_FEATURE[it.key];
      return (f === null || site.features[f]) && isKnownRouteFor(site.id, it.href, { v1: true, v12: true });
    });
}

const under = (p: string, base: string): boolean => p === base || p.startsWith(`${base}/`);
/** The pages of the Burrow on the hub, and their French twins under /fr. */
const isDaily = (p: string): boolean => Object.values(BURROW_PATHS).some((b) => under(p, b) || under(p, `/fr${b}`));
/** Group hubs are generated slugs: /bts-quiz, /twice-trivia (route-allowlist rule). */
const isHub = (p: string): boolean => /^\/[^/]+-(quiz|trivia)\/?$/.test(p);

/** Strip the /pt locale mirror so /pt/quizzes lights Quizzes like /quizzes. */
function base(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || '/';
  if (p === '/pt') return '/';
  return p.startsWith('/pt/') ? p.slice(3) : p;
}

// V12 (flag only; prototype NAVMAP / TABMAP: btland, kpdh, wma, nta). Checked before
// the v11 rules because the bridge quiz URL ends with -quiz like a group hub. With
// the flag off none of this is read and the v11 answers below are unchanged.
/** The four blindtest landings (lib/growth/bt-landing.ts LANDING_PATH) and the KPop
 *  Demon Hunters bridge quiz: Blindtest in the top bar and in the tab bar. */
const V12_BLINDTEST_PATHS: ReadonlySet<string> = new Set([
  '/guess-the-kpop-song', '/fr/blind-test-kpop', '/es/adivina-la-cancion-kpop', '/id/tebak-lagu-kpop',
  '/kpop-demon-hunters-quiz',
]);
/** Name them all and Which member are you, pretty URL or internal route: a group page
 *  (Groups in the top bar, Quizzes in the tab bar). */
const isV12GroupPage = (p: string, member: string): boolean =>
  /^\/[^/]+-name-all-members$/.test(p) || whichPage(member).test(p)
  || p.startsWith('/name-all/') || p.startsWith('/personality/');
// Run O1 (PERS-2): Which member are you is "Which character are you" on another site (the site's `vocabulary.member`: /which-*-character-are-you
// on anime). On kpop the word is "member" and the pattern is today's.
const WHICH_PAGE = new Map<string, RegExp>();
function whichPage(member: string): RegExp {
  let re = WHICH_PAGE.get(member);
  if (!re) { re = new RegExp(`^/which-[^/]+-${member.replace(/[^a-z]/g, '')}-are-you$`); WHICH_PAGE.set(member, re); }
  return re;
}

function v12Section(path: string, member: string): 'blindtest' | 'groups' | null {
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  if (V12_BLINDTEST_PATHS.has(p)) return 'blindtest';
  // G4 R2: a live room (host setup, room, join) is Blindtest (prototype `livegame`).
  if (under(p, '/live') || under(p, '/join')) return 'blindtest';
  if (isV12GroupPage(p, member)) return 'groups';
  return null;
}

/** Which top-nav item is active for a path (prototype NAVMAP), or null. `v12` is the
 *  flag (a parameter only so the tests can set it). */
export function activeNav(pathname: string, v12: boolean = isUxV12(), member: string = SITE.vocabulary.member, site: typeof SITE = SITE): NavKey | null {
  const p = base(pathname);
  if (p === '/') return 'home';
  if (v12) {
    const s = v12Section(p, member);
    if (s) return s;
  }
  if (under(p, '/quizzes') || under(p, '/q')) return 'quizzes';
  if (under(p, '/groups') || under(p, '/group') || under(p, '/series') || isHub(p)) return 'groups';
  if (under(p, '/blindtest') || under(p, '/g')) return 'blindtest';
  if (under(p, '/community')) return 'community';
  if (under(p, '/leaderboard')) return 'leaderboard';
  if (under(p, '/kpopcards') || under(p, '/cards')) return 'cards';
  if (site.id === 'hub' && isDaily(p)) return 'daily';
  return null;
}

/** Which bottom tab is active for a path (prototype TABMAP), or null. */
export function activeTab(pathname: string, v12: boolean = isUxV12(), member: string = SITE.vocabulary.member, site: typeof SITE = SITE): TabKey | null {
  const p = base(pathname);
  if (p === '/') return 'home';
  if (v12) {
    const s = v12Section(p, member);
    if (s) return s === 'groups' ? 'quizzes' : 'blindtest';
  }
  if (under(p, '/quizzes') || under(p, '/q') || under(p, '/groups') || under(p, '/group') || isHub(p)) return 'quizzes';
  if (under(p, '/blindtest') || under(p, '/g')) return 'blindtest';
  if (under(p, '/community') || under(p, '/leaderboard')) return 'community';
  if (under(p, '/kpopcards') || under(p, '/cards')) return 'cards';
  if (site.id === 'hub' && isDaily(p)) return 'daily';
  if (under(p, '/profile') || under(p, '/passport') || under(p, '/me') || under(p, '/u') || under(p, '/settings') || under(p, '/notifications')) return 'you';
  return null;
}

/**
 * A click the page may take over (open an overlay, navigate softly): primary
 * button, no modifier key, not already handled. Any other click keeps the browser's
 * own link behaviour (new tab, new window, download, context menu).
 */
export function isPlainClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}

/** Footer (prototype columns; every link is a real, existing route). */
export interface FooterCol { title: string; links: { label: string; href: string; external?: boolean }[] }
