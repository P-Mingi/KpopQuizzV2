// Bunnyverse Cards, lots 3 and 4 (lane GOALS): POST /api/cards/goals/claim -> { packs, shards, goals }. Claims the week once: +2 reward packs and
// +25 shards, only when the three goals of the Paris week are done. A refusal is 409 { error: 'claimed' | 'goal' }.
import { guard, json, refusalOf } from '@/lib/cards/api';
import { goalsFromJson } from '@/lib/cards/goals';

import type { GoalsJson } from '@/lib/cards/goals';
import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const now = new Date().toISOString();
  const { data, error } = await g.db.rpc('cards_week_claim', { p_user: g.userId, p_now: now });
  if (error || !data) {
    const why = refusalOf(error?.message);
    if (why === 'claimed' || why === 'goal') return json({ error: why }, 409);
    return json({ error: 'server' }, 500);
  }
  const r = data as { packs: number; shards: number };
  try {
    const sync = await g.db.rpc('cards_goals_sync', { p_user: g.userId, p_now: now });
    if (sync.error || !sync.data) return json({ error: 'server' }, 500);
    return json({ packs: Number(r.packs), shards: Number(r.shards), goals: goalsFromJson(sync.data as GoalsJson) });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
