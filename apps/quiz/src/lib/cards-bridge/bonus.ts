// Bunnyverse Cards, review 1 finding 1: POST /api/cards-bridge/bonus { source: 'kpopdle' }, sent by the Kpopdle win line once a game is won.
// The server records the bonus pack itself: cards_bonus_record (002-functions.sql) reads the player's Kpopdle wins of the Paris day from
// dle_plays, where the win is decided by dle_guess in the database (the browser holds no grant on that table and never sees the answer),
// and keeps one row per won play in cards_bonus_earned. The body only names the game; the player is the session's. A kpopquiz.org quiz earns
// nothing: its completion is a score the browser reports (POST /api/quiz/[id]/play checks only 0 <= score <= max), owner decision pending.
// Flags off: 404 like any unknown URL. A cross-site call: 403. A guest, a Team account or any failure: { signedIn: false }, nothing recorded.
import { NextResponse } from 'next/server';

import { isEditorialUser } from '@/lib/editorial/accounts';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { ownSite, readJson } from '@/lib/cards/api';
import { adsPerDay, bonusPerDay } from '@/lib/cards/flags';

import { cardsBridgesOn } from './flags';
import { parseWallet } from './parse';

const HEADERS = { 'Cache-Control': 'private, no-store' } as const;

export interface BonusAnswer {
  signedIn: boolean;
  /** Bonus packs the server recorded for this Paris day (Kpopdle wins), after this call. */
  earned?: number;
  /** What the player may still open today: min(cap, earned) minus the bonus packs opened. */
  bonusLeft?: number;
}

export interface BonusSource {
  userId(): Promise<string | null>;
  isTeam(userId: string): Promise<boolean>;
  /** cards_bonus_record: the bonus packs earned on the Paris day of `now`, after recording; null when the call failed. */
  record(userId: string, now: Date): Promise<number | null>;
  wallet(userId: string, now: Date): Promise<unknown>;
}

export function defaultBonusSource(): BonusSource {
  return {
    async userId() {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    isTeam: (id) => isEditorialUser(id),
    async record(userId, now) {
      const { data, error } = await createServiceRoleClient().rpc('cards_bonus_record', { p_user: userId, p_now: now.toISOString() });
      return error || typeof data !== 'number' ? null : data;
    },
    async wallet(userId, now) {
      const { data, error } = await createServiceRoleClient().rpc('cards_wallet', {
        p_user: userId, p_now: now.toISOString(), p_ads_limit: adsPerDay(), p_bonus_cap: bonusPerDay(),
      });
      return error ? null : data;
    },
  };
}

const answer = (body: BonusAnswer | { error: string }, status = 200): NextResponse => NextResponse.json(body, { status, headers: HEADERS });

export async function handleBonus(request: Request, source: BonusSource = defaultBonusSource(), now: Date = new Date()): Promise<NextResponse> {
  if (!cardsBridgesOn()) return new NextResponse(null, { status: 404 });
  if (!ownSite(request)) return answer({ error: 'origin' }, 403);
  const body = await readJson(request);
  if (body?.source !== 'kpopdle') return answer({ error: 'bad_request' }, 400);
  try {
    const id = await source.userId();
    if (!id || (await source.isTeam(id))) return answer({ signedIn: false });
    const earned = bonusPerDay() > 0 ? await source.record(id, now) : 0;
    if (earned === null) return answer({ signedIn: false });
    const wallet = parseWallet(await source.wallet(id, now));
    return answer({ signedIn: true, earned, bonusLeft: wallet?.bonusLeft ?? 0 });
  } catch (err) {
    console.error('[cards-bridge] bonus not recorded:', (err as Error)?.message ?? err);
    return answer({ signedIn: false });
  }
}
