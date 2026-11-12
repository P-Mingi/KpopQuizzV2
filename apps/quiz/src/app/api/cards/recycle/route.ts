// Bunnyverse Cards: POST /api/cards/recycle -> { recycled, shards, state }: every copy above one becomes shards, all at once
// (the binder button "Recycle extras"). `recycled` is the number of copies, `shards` the shards gained by this call; state.shards is the total.
import { guard, json, loadState } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const { data, error } = await g.db.rpc('cards_recycle', { p_user: g.userId, p_now: new Date().toISOString() });
  if (error || !data) return json({ error: 'server' }, 500);
  const r = data as { recycled: number; shards_gained: number };
  try {
    return json({ recycled: Number(r.recycled), shards: Number(r.shards_gained), state: await loadState(g.db, g.userId) });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
