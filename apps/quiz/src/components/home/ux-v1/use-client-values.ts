'use client';

import { useSyncExternalStore } from 'react';

// Browser-only values for the home islands, read through useSyncExternalStore so
// the server render and the hydration render agree (null on the server) and no
// effect has to copy them into state.

/* ---- clock: one shared 30 s tick for every countdown on the page ---- */
let nowMs: number | null = null;
let timer: number | null = null;
const tickers = new Set<() => void>();

function subscribeClock(cb: () => void): () => void {
  tickers.add(cb);
  if (timer === null) {
    nowMs = Date.now();
    timer = window.setInterval(() => { nowMs = Date.now(); tickers.forEach((t) => t()); }, 30_000);
  }
  return () => {
    tickers.delete(cb);
    if (tickers.size === 0 && timer !== null) { window.clearInterval(timer); timer = null; }
  };
}

/** Current time in ms on the client (refreshed every 30 s), null on the server. */
export function useNowMs(): number | null {
  return useSyncExternalStore(subscribeClock, () => { if (nowMs === null) nowMs = Date.now(); return nowMs; }, () => null);
}

/* ---- localStorage: a key's raw value, updated on cross-tab changes ---- */
function subscribeStorage(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

function readKey(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

/** Raw localStorage value of `key` (null when absent, blocked, or on the server). */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribeStorage, () => readKey(key), () => null);
}
