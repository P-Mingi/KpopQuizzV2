// Run O1, lot (c), lane B6: the browser side of POST /api/n/b. Fire and forget; with NEXT_PUBLIC_NET_BEACON off nothing is sent.
import { flagOn } from '@/lib/site/registry';

import type { NetBeacon } from './types';

// FandomVerse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export function sendNetBeacon(beacon: NetBeacon): void {
  if (!flagOn(process.env.NEXT_PUBLIC_NET_BEACON)) return;
  try {
    const body = JSON.stringify(beacon);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(`${BASE_PATH}/api/n/b`, new Blob([body], { type: 'text/plain' }))) return;
    }
    void fetch(`${BASE_PATH}/api/n/b`, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'same-origin' }).catch(() => undefined);
  } catch { /* a beacon never breaks a page */ }
}
