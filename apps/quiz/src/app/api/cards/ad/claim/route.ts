// KpopCards: POST /api/cards/ad/claim { ticket } -> { granted, replayed, reason?, stock? }. A rewarded ad (AdSense, the web path) gives +1 pack, once per ticket.
// The browser calls this only from Google's `adViewed` event. The server checks the ticket's owner, the minimum seconds since it was issued, the 2 hour window,
// single use and the daily cap (lib/cards/ad-claim.ts, cards_ad_pack_grant of 121-ad-packs.sql). Off (NET_CARDS_ADS, provider, publisher id): 404 like any URL.
import { closed, guard, json, readJson } from '@/lib/cards/api';
import { adPacksPerDay } from '@/lib/cards/ad-packs';
import { AD_WEB_AD_UNIT, adClaimEnv, adClaimOn, adClaimTx, claimCheck, claimMinSeconds } from '@/lib/cards/ad-claim';
import { timerPerDay } from '@/lib/cards/flags';

import type { NextRequest, NextResponse } from 'next/server';
import type { TicketRow } from '@/lib/cards/ad-claim';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const env = adClaimEnv();
  if (!adClaimOn(env)) return closed();
  const body = await readJson(req);
  const t = body?.ticket;
  if (typeof t !== 'string' || !UUID.test(t)) return json({ error: 'ticket' }, 409);
  const ticket = t.toLowerCase();
  const { data: row, error: re } = await g.db.from('cards_ad_tickets').select('user_id, issued_at, used_at').eq('id', ticket).maybeSingle();
  if (re) return json({ error: 'server' }, 500);
  const now = Date.now();
  const min = claimMinSeconds(env);
  const verdict = claimCheck((row ?? null) as TicketRow | null, g.userId, now, min);
  if (verdict === 'ticket') return json({ error: 'ticket' }, 409);
  if (verdict === 'too_soon') return json({ error: 'too_soon', min_seconds: min }, 409);
  const { data, error } = await g.db.rpc('cards_ad_pack_grant', {
    p_ticket: ticket, p_tx: adClaimTx(ticket), p_ad_unit: AD_WEB_AD_UNIT, p_now: new Date(now).toISOString(), p_daily_cap: adPacksPerDay(env), p_timer_cap: timerPerDay(),
  });
  if (error) {
    if (/cards: (ticket|key)/.test(error.message ?? '')) return json({ error: 'ticket' }, 409);
    return json({ error: 'server' }, 500);
  }
  const d = (data ?? {}) as { granted?: boolean; replayed?: boolean; reason?: string; stock?: number };
  return json({
    granted: d.granted === true,
    replayed: d.replayed === true,
    ...(d.reason ? { reason: d.reason } : {}),
    ...(typeof d.stock === 'number' ? { stock: d.stock } : {}),
  });
}
