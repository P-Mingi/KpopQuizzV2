// Bunnyverse Cards: POST /api/cards/ad/grant { ticket } -> { gained, shards, state } after a rewarded ad (lot 4 B4: an ad gives CARDS_AD_SHARDS
// shards, 25 by default, and no pack). The ticket was issued before the ad (ad/ticket) and is spent once, 10 seconds to 1 hour after, in the
// same transaction that counts the ad and adds the shards (cards_ad_grant): a replayed, unknown or foreign ticket is 409.
import { guard, json, limits, loadState, readJson, refusalOf } from '@/lib/cards/api';
import { adShards, cardsAdsOn } from '@/lib/cards/flags';

import type { NextRequest, NextResponse } from 'next/server';
import type { AdResult } from '@/lib/cards/types';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  if (!cardsAdsOn()) return json({ error: 'disabled' }, 409);
  const body = await readJson(req);
  const ticket = body?.ticket;
  if (typeof ticket !== 'string' || !UUID.test(ticket)) return json({ error: 'ticket' }, 409);
  const lim = limits();
  const { data, error } = await g.db.rpc('cards_ad_grant', {
    p_user: g.userId,
    p_ticket: ticket.toLowerCase(),
    p_now: new Date().toISOString(),
    p_ads_limit: lim.ads,
    p_shards: adShards(),
    p_timer_cap: lim.timer,
  });
  if (error || !data) {
    const why = refusalOf(error?.message);
    if (why === 'ticket') return json({ error: 'ticket' }, 409);
    if (why === 'ad_limit') return json({ error: 'limit' }, 409);
    return json({ error: 'server' }, 500);
  }
  const r = data as { gained: number; shards: number };
  try {
    const out: AdResult = { gained: Number(r.gained), shards: Number(r.shards), state: await loadState(g.db, g.userId) };
    return json(out);
  } catch {
    return json({ error: 'server' }, 500);
  }
}
