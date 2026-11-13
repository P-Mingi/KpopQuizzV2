// Bunnyverse Cards, lot 3 C1: POST /api/cards/craft { card_no } -> { card: { n, rarity, cost }, state }: spends CRAFT_COST[rarity] shards and
// stores a MISSING card, in one transaction (cards_craft). A refusal is 409 { error: 'shards' | 'owned' | 'card' }.
import { guard, json, loadState, readJson, refusalOf } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const n = body?.card_no;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 2_000_000_000) return json({ error: 'bad_request' }, 400);
  const { data, error } = await g.db.rpc('cards_craft', { p_user: g.userId, p_card_no: n, p_now: new Date().toISOString() });
  if (error || !data) {
    const why = refusalOf(error?.message);
    if (why === 'shards' || why === 'owned' || why === 'card') return json({ error: why }, 409);
    return json({ error: 'server' }, 500);
  }
  const r = data as { card_no: number; rarity: string; cost: number };
  try {
    return json({ card: { n: Number(r.card_no), rarity: r.rarity, cost: Number(r.cost) }, state: await loadState(g.db, g.userId) });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
