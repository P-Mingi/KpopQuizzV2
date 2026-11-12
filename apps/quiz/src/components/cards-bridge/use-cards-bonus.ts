'use client';

// Bunnyverse Cards, review 1 finding 1: after a Kpopdle win, asks the server to record the bonus pack (POST /api/cards-bridge/bonus). The server
// reads the win from the database itself; this call only says "look now". `null` while waiting or when the call fails: the line shows nothing.
import { useEffect, useState } from 'react';

import { withBasePath } from '@/lib/site/base-path';

import type { BonusAnswer } from '@/lib/cards-bridge/bonus';

export function useCardsBonus(): BonusAnswer | null {
  const [a, setA] = useState<BonusAnswer | null>(null);
  useEffect(() => {
    let live = true;
    fetch(withBasePath('/api/cards-bridge/bonus'), {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'kpopdle' }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<BonusAnswer>) : null))
      .then((j) => { if (live) setA(j); })
      .catch(() => { if (live) setA(null); });
    return () => { live = false; };
  }, []);
  return a;
}
