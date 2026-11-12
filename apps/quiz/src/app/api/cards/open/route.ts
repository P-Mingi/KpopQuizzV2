// Bunnyverse Cards: POST /api/cards/open { source: 'stock' | 'shards' | 'bonus' } -> { pack: { id, cards: [{ n, isNew }] }, state }.
// The draw is on the server (crypto.randomInt); cards_apply_pack spends the source and stores the five cards in one transaction.
// A refusal is 409 { error: 'empty' | 'shards' | 'bonus' }. The rewarded ad has its own routes (ad/ticket, ad/grant).
import { guard, json, readJson } from '@/lib/cards/api';
import { openPack } from '@/lib/cards/open-pack';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const source = body?.source;
  if (source !== 'stock' && source !== 'shards' && source !== 'bonus') return json({ error: 'bad_request' }, 400);
  try {
    return await openPack(g.db, g.userId, source, null);
  } catch {
    return json({ error: 'server' }, 500);
  }
}
