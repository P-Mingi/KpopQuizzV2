'use client';

// Bunnyverse Cards, lane B: the one browser read of the bridge islands (GET /api/cards-bridge/me). `null` while loading or when the read fails:
// every island then keeps its server markup or shows nothing.
import { useEffect, useState } from 'react';

import { withBasePath } from '@/lib/site/base-path';

import type { BridgeMe } from '@/lib/cards-bridge/me';

export function useCardsMe(owned = false): BridgeMe | null {
  const [me, setMe] = useState<BridgeMe | null>(null);
  useEffect(() => {
    let live = true;
    fetch(withBasePath(`/api/cards-bridge/me${owned ? '?owned=1' : ''}`), { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<BridgeMe>) : null))
      .then((j) => { if (live) setMe(j); })
      .catch(() => { if (live) setMe(null); });
    return () => { live = false; };
  }, [owned]);
  return me;
}
