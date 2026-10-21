// Run O1, lot (c), lane B6: the browser side of POST /api/n/b. Fire and forget; with NEXT_PUBLIC_NET_BEACON off nothing is sent.
import { flagOn } from '@/lib/site/registry';

import type { NetBeacon } from './types';

export function sendNetBeacon(beacon: NetBeacon): void {
  if (!flagOn(process.env.NEXT_PUBLIC_NET_BEACON)) return;
  try {
    const body = JSON.stringify(beacon);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon('/api/n/b', new Blob([body], { type: 'text/plain' }))) return;
    }
    void fetch('/api/n/b', { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'same-origin' }).catch(() => undefined);
  } catch { /* a beacon never breaks a page */ }
}
