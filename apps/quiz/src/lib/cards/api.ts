// Bunnyverse Cards: what every /api/cards/* route shares. Order of the guards: the build and the flag (404, like any unknown URL),
// the session (401), a Team account (403 editorial_account), then the work. Every answer is `cache-control: no-store`, except the public
// catalog. The service role does the reads and the RPC calls: the browser roles hold no grant on the cards tables (003-rls.sql).
import { NextResponse } from 'next/server';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { teamRefusal } from '@/lib/editorial/team-refusal';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { loadPool } from './draw';
import { adsPerDay, bonusPerDay, cardsAdsOn, cardsBridgesOn, cardsOpen } from './flags';
import { CAP, computeOdds } from './rules';

import type { NextRequest } from 'next/server';
import type { CatalogOdds, OwnedEntry, WalletState } from './types';

type ServiceDb = ReturnType<typeof createServiceRoleClient>;

export const NO_STORE = { 'cache-control': 'no-store' } as const;

export const json = (body: unknown, status = 200, headers: Record<string, string> = NO_STORE): NextResponse =>
  NextResponse.json(body, { status, headers });

/** The answer of a Cards route when the build is not the hub or NET_CARDS is off: the 404 of any unknown URL. */
export const closed = (): NextResponse => json({ error: 'not_found' }, 404);

/**
 * A write must come from the page's own site: an Origin header's host must be the request's host; without one the browser's own
 * Sec-Fetch-Site must say same-origin (a caller that sends neither is refused).
 */
export function ownSite(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'same-origin';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return !host || new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type Guard =
  | { readonly ok: true; readonly userId: string; readonly db: ServiceDb }
  | { readonly ok: false; readonly res: NextResponse };

/** 404 unless the hub build has NET_CARDS on; 401 without a session; 403 for a Team account; 403 for a cross-site write. */
export async function guard(req: NextRequest, opts: { write: boolean }): Promise<Guard> {
  if (!cardsOpen()) return { ok: false, res: closed() };
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return { ok: false, res: json({ error: 'unauthorized' }, 401) };
  const team = await teamRefusal(user.id);
  if (team) return { ok: false, res: team };
  if (opts.write && !ownSite(req)) return { ok: false, res: json({ error: 'origin' }, 403) };
  return { ok: true, userId: user.id, db: createServiceRoleClient() };
}

/** Reads a small JSON object body (at most 4 KB). Null when it is not one. */
export async function readJson(req: NextRequest, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

interface WalletJson {
  stock: number;
  anchor: string;
  ads_left: number;
  shards: number;
  bonus_left: number;
  next_at: string | null;
  midnight_at: string;
}

interface OwnedRow {
  card_no: number;
  copies: number;
  favorite: boolean;
  last_at: string;
}

/** The limits one request runs with: the settings, and 0 bonus packs while the bridges are off. */
export function limits(): { ads: number; bonus: number } {
  return { ads: adsPerDay(), bonus: cardsBridgesOn() ? bonusPerDay() : 0 };
}

const iso = (v: string | null): string | null => (v === null ? null : new Date(v).toISOString());

/** The odds of the real catalog, from the cached pool; null while the catalog is empty or unreadable. */
async function oddsOrNull(): Promise<CatalogOdds | null> {
  try {
    return computeOdds(await loadPool());
  } catch {
    return null;
  }
}

/** GET /api/cards/state: the wallet after the refill and the Paris midnight (read only), and the binder. */
export async function loadState(db: ServiceDb, userId: string, now: Date = new Date()): Promise<WalletState> {
  const lim = limits();
  const { data, error } = await db.rpc('cards_wallet', { p_user: userId, p_now: now.toISOString(), p_ads_limit: lim.ads, p_bonus_cap: lim.bonus });
  if (error || !data) throw new Error(`cards_wallet: ${error?.message ?? 'no data'}`);
  const w = data as WalletJson;
  const rows = await fetchAllRows<OwnedRow>(() =>
    db.from('cards_owned').select('card_no, copies, favorite, last_at').eq('user_id', userId).order('card_no', { ascending: true }),
  );
  const owned: OwnedEntry[] = rows.map((r) => ({ n: r.card_no, copies: r.copies, fav: r.favorite, at: new Date(r.last_at).toISOString() }));
  return {
    stock: w.stock,
    cap: CAP,
    nextAt: iso(w.next_at),
    midnightAt: new Date(w.midnight_at).toISOString(),
    adsLeft: w.ads_left,
    adsEnabled: cardsAdsOn(),
    shards: w.shards,
    bonusLeft: w.bonus_left,
    owned,
    odds: await oddsOrNull(),
  };
}

/** The refusals of cards_apply_pack, by the word after "cards: " in its message. */
export type PackRefusal = 'empty' | 'shards' | 'bonus' | 'ad_limit' | 'ticket' | 'pack' | 'source' | 'user';

export function refusalOf(message: string | undefined): PackRefusal | null {
  const m = /cards: (empty|shards|bonus|ad_limit|ticket|pack|source|user)\b/.exec(message ?? '');
  return m ? (m[1] as PackRefusal) : null;
}
