'use client';

import { useEffect, useState } from 'react';

// COST: /api/auth/me (force-dynamic) used to be fetched INDEPENDENTLY by every nav
// island that needs the signed-in state - the profile chip, the notification bell,
// the mobile top bar, and the home streak nudge - so a single page view spawned
// 2 to 4 identical serverless invocations. This shares ONE in-flight request and
// its result across all of them via a module-level cache, so a page view makes at
// most one /api/auth/me call. The cache lives for the client session and clears on
// a full reload, exactly like the mounted islands did before, so login/logout still
// update the nav on the next full navigation (unchanged behaviour, fewer calls).

export interface MeProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  xp?: number;
  level?: number;
  progress?: number;
  daily_streak?: number;
  last_daily_date?: string | null;
  ult_groups?: string[];
}

export interface MeResponse {
  is_admin?: boolean;
  profile: MeProfile | null;
}

const SIGNED_OUT: MeResponse = { profile: null };

let cache: MeResponse | null = null;
let inflight: Promise<MeResponse> | null = null;

function loadMe(): Promise<MeResponse> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : SIGNED_OUT))
    .then((d) => { cache = d ?? SIGNED_OUT; inflight = null; return cache; })
    .catch(() => { inflight = null; return SIGNED_OUT; });
  return inflight;
}

// Clear the shared cache (e.g. after sign-out) so the next reader re-fetches.
export function clearMe(): void {
  cache = null;
  inflight = null;
}

// Returns the shared /api/auth/me result, or null while it is still loading.
export function useMe(): MeResponse | null {
  const [state, setState] = useState<MeResponse | null>(cache);
  useEffect(() => {
    let cancelled = false;
    loadMe().then((d) => { if (!cancelled) setState(d); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
