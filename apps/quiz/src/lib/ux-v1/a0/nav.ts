// UX v11 navigation model (DESIGN-SPEC 16.5 + 17.1). Pure data + matchers so the
// server-rendered nav, the tab bar and the tests agree on one route map. Every
// item is a real <a href> (16.5): crawlers and keyboards see the real paths.

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

export const TAB_ITEMS: NavItem<TabKey>[] = [
  { key: 'home', label: 'Home', href: '/', icon: 'home' },
  { key: 'quizzes', label: 'Quizzes', href: '/quizzes', icon: 'layers' },
  { key: 'blindtest', label: 'Blindtest', href: '/blindtest', icon: 'music' },
  { key: 'community', label: 'Community', href: '/community', icon: 'users' },
  { key: 'you', label: 'You', href: '/profile', icon: 'user' },
];

const under = (p: string, base: string): boolean => p === base || p.startsWith(`${base}/`);
/** Group hubs are generated slugs: /bts-quiz, /twice-trivia (route-allowlist rule). */
const isHub = (p: string): boolean => /^\/[^/]+-(quiz|trivia)\/?$/.test(p);

/** Strip the /pt locale mirror so /pt/quizzes lights Quizzes like /quizzes. */
function base(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || '/';
  if (p === '/pt') return '/';
  return p.startsWith('/pt/') ? p.slice(3) : p;
}

/** Which top-nav item is active for a path (prototype NAVMAP), or null. */
export function activeNav(pathname: string): NavKey | null {
  const p = base(pathname);
  if (p === '/') return 'home';
  if (under(p, '/quizzes') || under(p, '/q')) return 'quizzes';
  if (under(p, '/groups') || under(p, '/group') || isHub(p)) return 'groups';
  if (under(p, '/blindtest') || under(p, '/g')) return 'blindtest';
  if (under(p, '/community')) return 'community';
  if (under(p, '/leaderboard')) return 'leaderboard';
  return null;
}

/** Which bottom tab is active for a path (prototype TABMAP), or null. */
export function activeTab(pathname: string): TabKey | null {
  const p = base(pathname);
  if (p === '/') return 'home';
  if (under(p, '/quizzes') || under(p, '/q') || under(p, '/groups') || under(p, '/group') || isHub(p)) return 'quizzes';
  if (under(p, '/blindtest') || under(p, '/g')) return 'blindtest';
  if (under(p, '/community') || under(p, '/leaderboard')) return 'community';
  if (under(p, '/profile') || under(p, '/me') || under(p, '/u') || under(p, '/settings') || under(p, '/notifications')) return 'you';
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
