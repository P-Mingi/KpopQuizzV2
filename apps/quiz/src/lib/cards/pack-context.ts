// Bunnyverse Cards, lot 3: what the draw needs to know about ONE player (server only, service role). The pure rules are in rules.ts
// (drawPack with a PackContext); here the two facts are read: whether the Ultra Rare guarantee is due (B10), which group halves
// the player owns (B11).
import { fetchAllRows } from '@/lib/db/fetch-all';

import { PITY_UR, subjectsOf } from './rules';

import type { createServiceRoleClient } from '@/lib/supabase/server';
import type { PackContext } from './rules';
import type { PoolCard } from './types';

type ServiceDb = ReturnType<typeof createServiceRoleClient>;

/** True when some subject of the pool has more than one card of a rarity (a group with its two halves). */
export function poolHasPairs(index: Map<string, PoolCard[]>): boolean {
  for (const list of index.values()) if (subjectsOf(list).some((s) => s.length > 1)) return true;
  return false;
}

/** True when the pool holds a card of the Ultra Rare rarity (B10 holds only then). */
export function poolHasUr(index: Map<string, PoolCard[]>): boolean {
  return (['idol', 'group', 'event'] as const).some((k) => (index.get(`${k}|UR`)?.length ?? 0) > 0);
}

export async function loadPackContext(db: ServiceDb, userId: string, index: Map<string, PoolCard[]>): Promise<PackContext> {
  const ctx: { pity?: boolean; owned?: ReadonlySet<number> } = {};
  if (poolHasUr(index)) {
    const { data } = await db.rpc('cards_pity_count', { p_user: userId });
    ctx.pity = typeof data === 'number' && data >= PITY_UR - 1;
  }
  if (poolHasPairs(index)) {
    const rows = await fetchAllRows<{ card_no: number }>(() =>
      db.from('cards_owned').select('card_no').eq('user_id', userId).order('card_no', { ascending: true }),
    );
    ctx.owned = new Set(rows.map((r) => r.card_no));
  }
  return ctx;
}
