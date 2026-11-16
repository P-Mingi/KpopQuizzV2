// KpopCards: POST /api/cards/ad/grant { key, ticket } -> AdGrantResponse: a rewarded ad gives CARDS_AD_SHARDS shards (25), and no pack. The ticket was issued
// before the ad (ad/ticket) and is spent once, 10 seconds to 1 hour after, in the transaction that counts the ad and adds the shards; the key makes a
// retry return the same answer.
import { adShards, cardsAdsOn, timerPerDay } from '@/lib/cards/flags';
import { run } from '@/lib/kpopcards/route';
import { errorOf, fail } from '@/lib/kpopcards/server';
import * as srv from '@/lib/kpopcards/server';
import { adsPerDay } from '@/lib/cards/flags';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, key: true }, async (c, i) => {
    if (!cardsAdsOn()) return fail('bad_request', 'disabled');
    const t = i.body.ticket;
    if (typeof t !== 'string' || !UUID.test(t)) return fail('ticket');
    const { data, error } = await c.db.rpc('cards_ad_grant', {
      p_user: c.userId, p_key: i.key, p_ticket: t.toLowerCase(), p_now: new Date(c.now).toISOString(), p_ads_limit: adsPerDay(), p_shards: adShards(), p_timer_cap: timerPerDay(),
    });
    if (error || !data) return fail(errorOf(error?.message) ?? 'server');
    const d = data as { replayed: boolean; gained: number; shards: number };
    const st = await srv.state(c);
    return 'error' in st ? st : { gained: Number(d.gained), shards: Number(d.shards), replayed: d.replayed, state: st };
  });
