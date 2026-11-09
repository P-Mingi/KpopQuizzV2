'use client';

import { useEffect, useState } from 'react';

import type { DailyToday } from '@/app/api/daily/today/route';

// Bunnyverse: this build's base path, inlined by Next at build time.
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

let cached: { day: string; promise: Promise<DailyToday | null> } | null = null;

function load(): Promise<DailyToday | null> {
  const day = new Date().toISOString().slice(0, 10);
  if (cached && cached.day === day) return cached.promise;
  const promise = fetch(`${BASE_PATH}/api/daily/today`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { daily?: DailyToday | null } | null) => j?.daily ?? null)
    .catch(() => null);
  cached = { day, promise };
  return promise;
}

/** Today's quiz of the day (public data), read once per page. null until it answers, and when there is none. */
export function useDailyToday(): DailyToday | null {
  const [d, setD] = useState<DailyToday | null>(null);
  useEffect(() => {
    let live = true;
    void load().then((v) => { if (live) setD(v); });
    return () => { live = false; };
  }, []);
  return d;
}
