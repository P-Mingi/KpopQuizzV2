// KpopCards: GET /api/cards/ad/ssv?... the ad network's signed completion callback for a rewarded ad that gives +1 pack. The only way an ad gives a pack.
// No session: the caller is the network. Everything is checked on the server: the flag (404 while off), the signature against the network's public keys,
// our ad unit, a fresh timestamp, the ticket in custom_data and its owner (the user_id the callback echoes must be the ticket's owner); the database then
// spends the ticket once, gives one pack per transaction id and stops at the daily cap (cards_ad_pack_grant, 121-ad-packs.sql).
// Answers: 404 off, 400 a callback that is not valid (never retried by a sane network), 200 { granted } when the event was understood (granted or not),
// 500 on a server fault (the network may retry: the transaction id makes a retry harmless).
import { closed, json } from '@/lib/cards/api';
import { adPacksOn, adPacksPerDay, createKeyCache, verifySsv } from '@/lib/cards/ad-packs';
import { cardsOpen, timerPerDay } from '@/lib/cards/flags';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = createKeyCache();
const env = () => ({
  NET_CARDS_AD_PACKS: process.env.NET_CARDS_AD_PACKS,
  CARDS_AD_PACKS_PER_DAY: process.env.CARDS_AD_PACKS_PER_DAY,
  CARDS_AD_SSV_AD_UNIT: process.env.CARDS_AD_SSV_AD_UNIT,
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cardsOpen() || !adPacksOn(env())) return closed();
  const search = new URL(req.url).search;
  const keyId = new URLSearchParams(search).get('key_id') ?? '';
  const now = Date.now();
  const keys = await cache.get(fetch, keyId, now);
  const v = verifySsv(search, keys, env(), now);
  if (!v.ok) return json({ error: v.why }, 400);
  const db = createServiceRoleClient();
  // The callback must name the ticket's owner: a valid signature on a callback for someone else's ticket gives nothing.
  const { data: t, error: te } = await db.from('cards_ad_tickets').select('user_id').eq('id', v.ticket).maybeSingle();
  if (te) return json({ error: 'server' }, 500);
  const owner = (t as { user_id?: string } | null)?.user_id ?? null;
  if (!owner || v.user === null || owner.toLowerCase() !== v.user) return json({ error: 'ticket' }, 400);
  const { data, error } = await db.rpc('cards_ad_pack_grant', {
    p_ticket: v.ticket, p_tx: v.tx, p_ad_unit: v.adUnit, p_now: new Date(now).toISOString(), p_daily_cap: adPacksPerDay(env()), p_timer_cap: timerPerDay(),
  });
  if (error) {
    if (/cards: (ticket|key)/.test(error.message ?? '')) return json({ error: 'ticket' }, 400);
    return json({ error: 'server' }, 500);
  }
  const d = (data ?? {}) as { granted?: boolean; replayed?: boolean; reason?: string };
  return json({ granted: d.granted === true, replayed: d.replayed === true, ...(d.reason ? { reason: d.reason } : {}) });
}
