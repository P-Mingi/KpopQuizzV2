// Bunnyverse Cards: GET /api/cards/catalog: the public catalog (cards, entities, photo credits and crops), cached. Hub build with NET_CARDS
// only (else 404). No sign-in: the credits are public by design (/credits). The one Cards answer that is not no-store.
// While the hub's private launch is on, only an allowed account gets it, and never from a shared cache (review 1 finding 10).
import { NO_STORE, closed, json, privateGate } from '@/lib/cards/api';
import { loadCatalog } from '@/lib/cards/catalog';
import { cardsOpen } from '@/lib/cards/flags';
import { privateLaunchOn } from '@/lib/cards/private';

import type { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  if (!cardsOpen()) return closed();
  const gated = await privateGate();
  if (gated) return gated;
  try {
    const cache = privateLaunchOn() ? { ...NO_STORE } : { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' };
    return json(await loadCatalog(), 200, cache);
  } catch {
    return json({ error: 'server' }, 500);
  }
}
