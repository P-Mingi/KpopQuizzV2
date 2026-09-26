'use client';

import { useEffect, useState } from 'react';

import { clearMe, useMe } from '@/lib/auth/use-me';

import { useIsClient } from './use-is-client';

import type { MeResponse } from '@/lib/auth/use-me';

const EVT = 'ux:me-refresh';
let latest: MeResponse | null = null;
let inflight: Promise<MeResponse> | null = null;

/**
 * Re-read the signed-in profile (after a quiz or blindtest: the streak pill,
 * popover and greeting switch to "saved", 16.7). One shared GET /api/auth/me for
 * every island that listens. Read only.
 */
export function refreshUxMe(): void {
  clearMe();
  if (!inflight) {
    inflight = fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : { profile: null }))
      .catch(() => ({ profile: null }) as MeResponse)
      .then((d) => { latest = d ?? { profile: null }; inflight = null; window.dispatchEvent(new Event(EVT)); return latest; });
  }
}

/**
 * The shared /api/auth/me result (null while loading), refreshed by refreshUxMe().
 * Always null on the server and during hydration: useMe() and refreshUxMe() seed
 * from module caches that the shell's islands have usually filled by the time a
 * late page island hydrates, and a signed-in or guest-only first render there would
 * not match the server HTML (P4 request 3). Islands that mount after hydration get
 * the cached value on their first render, as before.
 */
export function useUxMe(): MeResponse | null {
  const base = useMe();
  const mounted = useIsClient();
  const [fresh, setFresh] = useState<MeResponse | null>(latest);
  useEffect(() => {
    const on = (): void => setFresh(latest);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  if (!mounted) return null;
  return fresh ?? base;
}
