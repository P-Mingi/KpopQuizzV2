// W-NAV - the two worlds that share one identity: PLAY (games/quiz product) and
// VERSE (fandom platform). World is a pure function of the route, so it is correct
// during static prerender (the client nav reads it via usePathname, which resolves
// per-URL at prerender time - no flash, crawler sees the right chrome, ISR intact).
// This is CHROME ONLY: it never changes content, URLs, or head tags.

export type World = 'play' | 'verse';

/**
 * Which world a path belongs to. Verse world = /verse and everything under it;
 * Play world = every other route. Community (/leaderboard) is SHARED - it never
 * switches the world, it just appears in both nav bars.
 */
export function worldForPath(pathname: string): World {
  return pathname === '/verse' || pathname.startsWith('/verse/') ? 'verse' : 'play';
}

// V-BUILDER-2 - the builder surfaces suppress ALL global chrome (nav, footer, tab
// bar), the same /q/ fullscreen-hide pattern the mobile chrome already uses:
//   - /build/<slug>          the chrome-less draft render (the iframe CONTENT)
//   - /verse/<slug>/build    the builder SHELL (its own slim top bar + canvas)
// The shell is a full-screen fixed takeover, so the space hero/tabs from the verse
// layout render behind it (ISR-cached) and the root chrome is hidden here too.
export function isBuilderCanvas(pathname: string): boolean {
  return pathname.startsWith('/build/') || /^\/verse\/[^/]+\/build\/?$/.test(pathname);
}

// Chrome accent per world: Play keeps the pink brand, Verse gets a violet family so
// the two worlds feel distinct. Used only for nav chrome, never page content.
export const WORLD_ACCENT: Record<World, string> = {
  play: 'var(--brand)',
  verse: '#7c5cfc',
};

export const OTHER_WORLD: Record<World, World> = { play: 'verse', verse: 'play' };

// The home of each world - the toggle's door to the other side. Root / stays the
// games home (Play); /verse is the Fandoms directory (Verse).
export const WORLD_HOME: Record<World, string> = { play: '/', verse: '/verse' };

export const WORLD_LABEL: Record<World, string> = { play: 'Play', verse: 'Verse' };

// V-UPGRADE-1 Phase B - shared surfaces (Community / Profile / Notifications) live
// at a Play URL and mirror under /verse. worldHref rewrites a Play shared-surface
// href to the CURRENT world's mirror, so an internal link inside shared content
// keeps you in-world one level deeper (from Verse you stay in Verse). The Play
// world, and any non-shared href, pass through unchanged; query/hash is preserved.
// The /verse mirrors canonicalize back to these Play URLs, so this only steers
// navigation - it never changes a page's canonical identity.
export function worldHref(href: string, world: World): string {
  if (world !== 'verse' || href[0] !== '/') return href;
  const sep = href.search(/[?#]/);
  const path = sep === -1 ? href : href.slice(0, sep);
  const suffix = sep === -1 ? '' : href.slice(sep);
  let mapped: string | null = null;
  if (path === '/leaderboard') mapped = '/verse/community';
  else if (path === '/me' || path === '/profile') mapped = '/verse/me';
  else if (path === '/notifications') mapped = '/verse/notifications';
  else { const m = /^\/u\/([^/]+)$/.exec(path); if (m) mapped = `/verse/u/${m[1]}`; }
  return mapped ? mapped + suffix : href;
}

// Preference cookie (W-NAV step 4): a DELIBERATE toggle click records the world the
// user chose. It may only ever open the preferred world's home on a later visit to
// "/", read client-side, never as a crawler-visible redirect.
export const WORLD_COOKIE = 'world';
