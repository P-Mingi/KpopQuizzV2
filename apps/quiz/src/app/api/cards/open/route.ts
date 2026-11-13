// Bunnyverse Cards: POST /api/cards/open { source: 'stock' | 'shards' | 'bonus' } -> { pack: { id, cards: [{ n, isNew }] }, state }.
// The draw is on the server (crypto.randomInt); cards_apply_pack spends the source and stores the five cards in one transaction.
// Lot 3: { source: 'stock', focus: 'group:Q123' } opens a focus pack (once a Paris day, cards 2 and 4 from that group).
// A refusal is 409 { error: 'empty' | 'shards' | 'bonus' | 'focus_used' }. The rewarded ad has its own routes (ad/ticket, ad/grant).
import { guard, json, readJson } from '@/lib/cards/api';
import { openPack } from '@/lib/cards/open-pack';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROUP_ID = /^group:[A-Za-z0-9_.-]{1,80}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const source = body?.source;
  if (source !== 'stock' && source !== 'shards' && source !== 'bonus') return json({ error: 'bad_request' }, 400);
  const focusRaw = body?.focus;
  let focus: string | null = null;
  if (focusRaw !== undefined && focusRaw !== null) {
    // A focus pack is a pack from the timer for a group id.
    if (source !== 'stock' || typeof focusRaw !== 'string' || !GROUP_ID.test(focusRaw)) return json({ error: 'bad_request' }, 400);
    focus = focusRaw;
  }
  try {
    return await openPack(g.db, g.userId, source, focus);
  } catch {
    return json({ error: 'server' }, 500);
  }
}
