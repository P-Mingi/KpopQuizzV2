// Bunnyverse Cards: POST /api/cards/ad/ticket -> { ticket } before a rewarded ad, or 409 { error: 'limit' | 'disabled' }.
// Single use: ad/grant spends it once. Ads are off (disabled) unless NET_CARDS_ADS is on and CARDS_ADS_PER_DAY is above 0.
import { guard, json, limits } from '@/lib/cards/api';
import { cardsAdsOn } from '@/lib/cards/flags';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  if (!cardsAdsOn()) return json({ error: 'disabled' }, 409);
  const { data, error } = await g.db.rpc('cards_issue_ticket', {
    p_user: g.userId,
    p_now: new Date().toISOString(),
    p_ads_limit: limits().ads,
  });
  if (error) return json({ error: 'server' }, 500);
  if (!data) return json({ error: 'limit' }, 409);
  return json({ ticket: data as string });
}
