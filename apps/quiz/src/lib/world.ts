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

// Preference cookie (W-NAV step 4): a DELIBERATE toggle click records the world the
// user chose. It may only ever open the preferred world's home on a later visit to
// "/", read client-side, never as a crawler-visible redirect.
export const WORLD_COOKIE = 'world';
