// UX v11 navigation model (DESIGN-SPEC 16.5 + 17.1). Pure data + matchers so the
// server-rendered nav, the tab bar and the tests agree on one route map. Every
// item is a real <a href> (16.5): crawlers and keyboards see the real paths.

import { SITE } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';
import { isUxV12 } from '@/lib/ux-v12';

import type { UxIconName } from './icons';

export type NavKey = 'home' | 'quizzes' | 'groups' | 'blindtest' | 'community' | 'leaderboard';
export type TabKey = 'home' | 'quizzes' | 'blindtest' | 'community' | 'you';

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
  home: null, quizzes: 'quizzes', groups: 'topicHubs', blindtest: 'blindTest', community: 'community', leaderboard: 'leaderboards',
};

// The hub (home v3, 2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the tabs of its home on every hub page. Its sections live on
// the home, so the tabs lead there: Quizzes to Hot right now, Blind test to Today (its player), Community to Top fans. The Burrow joins
// them with its pages and the dailyGuess flag (step 4 of the daily games).
const HUB_NAV: NavItem<NavKey>[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home' },
  { key: 'quizzes', label: 'Quizzes', href: '/#hot', icon: 'layers' },
  { key: 'blindtest', label: 'Blind test', href: '/#today', icon: 'music' },
  { key: 'community', label: 'Community', href: '/#fans', icon: 'msg' },
];

export function navItemsFor(site: typeof SITE = SITE): NavItem<NavKey>[] {
  if (site.id === 'kpop') return NAV_ITEMS;
  if (site.id === 'hub') return HUB_NAV;
  const topic = site.vocabulary.topicPlural;
  return NAV_ITEMS
    .map((it) => (it.key === 'groups' ? { ...it, label: topic.charAt(0).toUpperCase() + topic.slice(1), href: '/series' } : it))
    .filter((it) => {
      const f = NAV_FEATURE[it.key];
      return (f === null || site.features[f]) && isKnownRouteFor(site.id, it.href, { v1: true, v12: true });
    });
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
  home: null, quizzes: 'quizzes', blindtest: 'blindTest', community: 'community', you: null,
};
const YOU_HREF: Record<'anime' | 'hub', string> = { anime: '/me', hub: '/passport' };

const HUB_TABS: NavItem<TabKey>[] = [
  ...HUB_NAV.map((it) => ({ ...it, key: it.key as TabKey, icon: it.key === 'community' ? ('users' as const) : it.icon })),
  { key: 'you', label: 'You', href: YOU_HREF.hub, icon: 'user' },
];

export function tabItemsFor(site: typeof SITE = SITE): NavItem<TabKey>[] {
  if (site.id === 'kpop') return TAB_ITEMS;
  if (site.id === 'hub') return HUB_TABS;
  const id = site.id;
  return TAB_ITEMS
    .map((it) => (it.key === 'you' ? { ...it, href: YOU_HREF[id] } : it))
    .filter((it) => {
      const f = TAB_FEATURE[it.key];
      return (f === null || site.features[f]) && isKnownRouteFor(site.id, it.href, { v1: true, v12: true });
    });
}

const under = (p: string, base: string): boolean => p === base || p.startsWith(`${base}/`);
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
export function activeNav(pathname: string, v12: boolean = isUxV12(), member: string = SITE.vocabulary.member): NavKey | null {
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
  return null;
}

/** Which bottom tab is active for a path (prototype TABMAP), or null. */
export function activeTab(pathname: string, v12: boolean = isUxV12(), member: string = SITE.vocabulary.member): TabKey | null {
  const p = base(pathname);
  if (p === '/') return 'home';
  if (v12) {
    const s = v12Section(p, member);
    if (s) return s === 'groups' ? 'quizzes' : 'blindtest';
  }
  if (under(p, '/quizzes') || under(p, '/q') || under(p, '/groups') || under(p, '/group') || isHub(p)) return 'quizzes';
  if (under(p, '/blindtest') || under(p, '/g')) return 'blindtest';
  if (under(p, '/community') || under(p, '/leaderboard')) return 'community';
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
