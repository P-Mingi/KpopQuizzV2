// Bunnyverse Cards: the server draw. The odds and the kind weights are in rules.ts (pure, testable with a seeded rng); here the
// randomness is crypto.randomInt (never the non-crypto generator) and the pool is cards_catalog where in_packs, cached for 5 minutes.
// Server only: the service role reads the catalog, and the pack never leaves the server before cards_apply_pack stores it.
import { randomInt } from 'node:crypto';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { drawPack, indexPool } from './rules';

import type { PoolCard, Rng } from './types';

/** Cryptographic integers in [0, max). */
export const serverRng: Rng = (max) => randomInt(max);

export const POOL_TTL_MS = 5 * 60 * 1000;

type PoolIndex = Map<string, PoolCard[]>;
let cached: { at: number; index: PoolIndex; size: number } | null = null;

interface PoolRow {
  card_no: number;
  rarity: PoolCard['rarity'];
  cards_entities: { kind: PoolCard['kind']; active: boolean } | { kind: PoolCard['kind']; active: boolean }[] | null;
}

/** Reads the pool: every card in packs whose entity is active. Paged past the 1,000-row cap. */
export async function readPool(): Promise<PoolCard[]> {
  const db = createServiceRoleClient();
  const rows = await fetchAllRows<PoolRow>(() =>
    db
      .from('cards_catalog')
      .select('card_no, rarity, cards_entities!inner(kind, active)')
      .eq('in_packs', true)
      .eq('cards_entities.active', true)
      .order('card_no', { ascending: true }),
  );
  const pool: PoolCard[] = [];
  for (const r of rows) {
    const e = Array.isArray(r.cards_entities) ? r.cards_entities[0] : r.cards_entities;
    if (e?.active) pool.push({ n: r.card_no, kind: e.kind, rarity: r.rarity });
  }
  return pool;
}

/** The indexed pool, cached for 5 minutes per server instance. `read` and `now` are injectable for tests. */
export async function loadPool(read: () => Promise<PoolCard[]> = readPool, now: number = Date.now()): Promise<PoolIndex> {
  if (cached && now - cached.at < POOL_TTL_MS) return cached.index;
  const pool = await read();
  if (pool.length === 0) throw new Error('cards: the catalog has no card in packs');
  cached = { at: now, index: indexPool(pool), size: pool.length };
  return cached.index;
}

export function resetPoolCache(): void {
  cached = null;
}

/** One pack of 5 card numbers, drawn on the server. */
export async function drawServerPack(opts: { rng?: Rng; read?: () => Promise<PoolCard[]>; now?: number } = {}): Promise<number[]> {
  const index = await loadPool(opts.read, opts.now);
  return drawPack(index, opts.rng ?? serverRng);
}
