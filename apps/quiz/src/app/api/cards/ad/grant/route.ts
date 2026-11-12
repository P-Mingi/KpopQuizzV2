// Bunnyverse Cards: POST /api/cards/ad/grant { ticket } after Google's rewarded event -> like /open with source 'ad'.
// The ticket is spent once inside cards_apply_pack (same transaction as the pack): a replayed, unknown or foreign ticket is 409.
import { guard, json, readJson } from '@/lib/cards/api';
import { cardsAdsOn } from '@/lib/cards/flags';
import { openPack } from '@/lib/cards/open-pack';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  if (!cardsAdsOn()) return json({ error: 'disabled' }, 409);
  const body = await readJson(req);
  const ticket = body?.ticket;
  if (typeof ticket !== 'string' || !UUID.test(ticket)) return json({ error: 'ticket' }, 409);
  try {
    return await openPack(g.db, g.userId, 'ad', ticket.toLowerCase());
  } catch {
    return json({ error: 'server' }, 500);
  }
}
