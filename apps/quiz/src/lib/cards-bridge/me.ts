// Bunnyverse Cards, lane B: GET /api/cards-bridge/me, the one same-origin read of the bridge islands (home block, group block,
// quiz-end and Kpopdle-win line). kpopquiz.org pages are cached, so the per-fan numbers are asked after hydration, never in the page.
// Flag off: 404 like any unknown URL. A guest, a Team account or any failure answers `{ signedIn: false }`: the islands show their
// guest line or nothing. Read only: cards_wallet is the STABLE function of lane C; nothing is written or granted here.
import { NextResponse } from 'next/server';

import { isEditorialUser } from '@/lib/editorial/accounts';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { ADS_PER_DAY_DEFAULT, BONUS_PER_DAY_DEFAULT } from '@/lib/cards/rules';

import { cardsBridgesOn } from './flags';
import { parseWallet } from './parse';

import type { BridgeWallet } from './parse';

const HEADERS = { 'Cache-Control': 'private, no-store' } as const;

/** A positive integer from the environment (CARDS_BONUS_PER_DAY, CARDS_ADS_PER_DAY), else the default of the rules. */
export function envInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n >= 0 ? n : fallback;
}

export interface BridgeMe {
  signedIn: boolean;
  wallet?: BridgeWallet;
  /** Card numbers owned, only when asked (`?owned=1`). */
  owned?: number[];
}

export interface MeSource {
  userId(): Promise<string | null>;
  isTeam(userId: string): Promise<boolean>;
  wallet(userId: string, now: Date): Promise<unknown>;
  owned(userId: string): Promise<number[] | null>;
}

export function defaultSource(): MeSource {
  return {
    async userId() {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    isTeam: (id) => isEditorialUser(id),
    async wallet(userId, now) {
      const { data, error } = await createServiceRoleClient().rpc('cards_wallet', {
        p_user: userId, p_now: now.toISOString(),
        p_ads_limit: envInt(process.env.CARDS_ADS_PER_DAY, ADS_PER_DAY_DEFAULT), p_bonus_cap: envInt(process.env.CARDS_BONUS_PER_DAY, BONUS_PER_DAY_DEFAULT),
      });
      return error ? null : data;
    },
    async owned(userId) {
      const { data, error } = await createServiceRoleClient().from('cards_owned').select('card_no').eq('user_id', userId).gt('copies', 0).limit(10000);
      return error ? null : (data ?? []).map((r: { card_no: number }) => r.card_no);
    },
  };
}

export async function buildMe(source: MeSource, wantOwned: boolean, now: Date = new Date()): Promise<BridgeMe> {
  try {
    const id = await source.userId();
    if (!id || (await source.isTeam(id))) return { signedIn: false };
    const wallet = parseWallet(await source.wallet(id, now));
    const out: BridgeMe = { signedIn: true, ...(wallet ? { wallet } : {}) };
    if (wantOwned) {
      const owned = await source.owned(id);
      if (owned) out.owned = owned;
    }
    return out;
  } catch (err) {
    console.error('[cards-bridge] me hidden:', (err as Error)?.message ?? err);
    return { signedIn: false };
  }
}

export async function handleMe(request: Request, source: MeSource = defaultSource()): Promise<NextResponse> {
  if (!cardsBridgesOn()) return new NextResponse(null, { status: 404 });
  const wantOwned = new URL(request.url).searchParams.get('owned') === '1';
  return NextResponse.json(await buildMe(source, wantOwned), { headers: HEADERS });
}
