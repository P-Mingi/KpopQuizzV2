'use client';

// Run O1, lot (c), lane B6: GET /api/n/me for the client islands (NetLink, the "Your sites" menu). One shared request per
// page view. A visitor without a Supabase auth cookie is a guest: nothing is fetched. Called only after hydration.
import { useEffect, useState } from 'react';

import type { NetMe } from './types';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

let cache: NetMe | null | undefined; // undefined: not asked yet; null: guest or unavailable
let inflight: Promise<NetMe | null> | null = null;

function hasAuthCookie(): boolean {
  try {
    return /(?:^|;\s*)sb-[a-z0-9-]+-auth-token/i.test(document.cookie);
  } catch {
    return false;
  }
}

export function fetchNetMe(): Promise<NetMe | null> {
  if (cache !== undefined) return Promise.resolve(cache);
  if (inflight) return inflight;
  if (!hasAuthCookie()) {
    cache = null;
    return Promise.resolve(null);
  }
  inflight = fetch(`${BASE_PATH}/api/n/me`, { credentials: 'same-origin', cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<NetMe>) : null))
    .catch(() => null)
    .then((d) => { cache = d; inflight = null; return d; });
  return inflight;
}

/** Forget the answer (after a sign-out, or after the viewer changed a setting). */
export function clearNetMe(): void {
  cache = undefined;
  inflight = null;
}

/** undefined while loading; null for a guest or when the answer is unavailable; else the viewer's NetMe. */
export function useNetMe(): NetMe | null | undefined {
  const [me, setMe] = useState<NetMe | null | undefined>(cache);
  useEffect(() => {
    let live = true;
    void fetchNetMe().then((d) => { if (live) setMe(d); });
    return () => { live = false; };
  }, []);
  return me;
}
