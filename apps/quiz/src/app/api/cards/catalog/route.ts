// Bunnyverse Cards: GET /api/cards/catalog: the public catalog (cards, entities, photo credits and crops), cached. Hub build with NET_CARDS
// only (else 404). No sign-in: the credits are public by design (/credits). The one Cards answer that is not no-store.
import { closed, json } from '@/lib/cards/api';
import { loadCatalog } from '@/lib/cards/catalog';
import { cardsOpen } from '@/lib/cards/flags';

import type { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  if (!cardsOpen()) return closed();
  try {
    return json(await loadCatalog(), 200, { 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
