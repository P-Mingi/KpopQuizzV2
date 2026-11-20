// Bunnyverse Cards: POST /api/cards/ad/ticket -> { ticket } before a rewarded ad, or 409 { error: 'limit' | 'disabled' }.
// Single use: ad/claim (a pack) or ad/grant (older, shards) spends it once. Ads are off (disabled) unless NET_CARDS_ADS is on and CARDS_ADS_PER_DAY is above 0.
// Launch polish: no ticket either (limit) once the player has had today's ad packs (CARDS_AD_PACKS_PER_DAY), so no ad is shown for nothing.
import { guard, json, limits } from '@/lib/cards/api';
import { adPacksPerDay } from '@/lib/cards/ad-packs';
import { cardsAdsOn } from '@/lib/cards/flags';
import { parisDayOf } from '@/lib/cards/rules';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  if (!cardsAdsOn()) return json({ error: 'disabled' }, 409);
  const today = parisDayOf(Date.now());
  const { data: ev, error: ee } = await g.db.from('cards_ad_events').select('transaction_id').eq('user_id', g.userId).eq('paris_day', today).eq('granted', true);
  if (ee) return json({ error: 'server' }, 500);
  if (((ev ?? []) as unknown[]).length >= adPacksPerDay({ CARDS_AD_PACKS_PER_DAY: process.env.CARDS_AD_PACKS_PER_DAY })) return json({ error: 'limit' }, 409);
  const { data, error } = await g.db.rpc('cards_issue_ticket', {
    p_user: g.userId,
    p_now: new Date().toISOString(),
    p_ads_limit: limits().ads,
  });
  if (error) return json({ error: 'server' }, 500);
  if (!data) return json({ error: 'limit' }, 409);
  return json({ ticket: data as string });
}
