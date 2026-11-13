// Bunnyverse Cards, lot 3 C4: POST /api/cards/wish { card_no, on } -> { on, count }: adds a MISSING card to the wishlist or removes one (at most
// WISHLIST_MAX cards). A refusal is 409 { error: 'wish_limit' | 'owned' | 'card' }.
import { guard, json, readJson, refusalOf } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const n = body?.card_no;
  const on = body?.on;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 2_000_000_000 || typeof on !== 'boolean') return json({ error: 'bad_request' }, 400);
  const { data, error } = await g.db.rpc('cards_wish', { p_user: g.userId, p_card_no: n, p_on: on, p_now: new Date().toISOString() });
  if (error || !data) {
    const why = refusalOf(error?.message);
    if (why === 'wish_limit' || why === 'owned' || why === 'card') return json({ error: why }, 409);
    return json({ error: 'server' }, 500);
  }
  const r = data as { on: boolean; count: number };
  return json({ on: r.on === true, count: Number(r.count) });
}
