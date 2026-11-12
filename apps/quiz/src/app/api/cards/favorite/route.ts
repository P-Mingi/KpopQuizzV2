// Bunnyverse Cards: POST /api/cards/favorite { n, on } -> { ok }: the star on an owned card. ok is false for a card the player does not own.
import { guard, json, readJson } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const n = body?.n;
  const on = body?.on;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 2_000_000_000 || typeof on !== 'boolean') return json({ error: 'bad_request' }, 400);
  const { data, error } = await g.db.rpc('cards_favorite', { p_user: g.userId, p_card_no: n, p_on: on });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: data === true });
}
