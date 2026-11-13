// Bunnyverse Cards, lots 3 and 4 (lane GOALS): GET /api/cards/goals -> { rewardPacks, week, sets, finished }. cards_goals_sync first pays
// the sets the player already completed and has not been paid for (once per set, ever), then reads the packs waiting, the week and every
// set. Same guards as every Cards route: hub build with NET_CARDS, private launch, session, not a Team account (a Team account earns nothing).
import { guard, json } from '@/lib/cards/api';
import { goalsFromJson } from '@/lib/cards/goals';

import type { GoalsJson } from '@/lib/cards/goals';
import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: false });
  if (!g.ok) return g.res;
  try {
    const { data, error } = await g.db.rpc('cards_goals_sync', { p_user: g.userId, p_now: new Date().toISOString() });
    if (error || !data) return json({ error: 'server' }, 500);
    return json(goalsFromJson(data as GoalsJson));
  } catch {
    return json({ error: 'server' }, 500);
  }
}
