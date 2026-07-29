'use client';

import { WORLD_COOKIE, type World } from '@/lib/world';

// W-NAV step 4 - the preference cookie is written ONLY by a deliberate toggle click
// (rememberWorld), client-side. It is deliberately NOT httpOnly and NOT set by the
// server: it must never influence what a crawler is served. The reader
// (preferred-world open on "/") lives in world-home-preference.tsx and runs purely
// client-side after hydration, so Googlebot - which does not send this cookie and is
// treated as no-cookie - always gets the games home at "/". No 3xx, ever.

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Record the world the user deliberately switched to. Client-only, best-effort. */
export function rememberWorld(world: World): void {
  try {
    document.cookie = `${WORLD_COOKIE}=${world}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // Cookies disabled - the toggle still navigates; preference just is not saved.
  }
}

/** Read the saved preference, or null. Client-only. */
export function readWorldPreference(): World | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${WORLD_COOKIE}=(play|verse)`));
    return (m?.[1] as World | undefined) ?? null;
  } catch {
    return null;
  }
}
