// Bunnyverse Cards: the shared core of POST /api/cards/open and POST /api/cards/ad/grant: draw on the server, store through
// cards_apply_pack (which spends the source, checks the five cards and stores them in one transaction), answer { pack, state }.
import { drawServerPack, loadPool, resetPoolCache } from './draw';
import { json, limits, loadState, refusalOf } from './api';
import { loadPackContext } from './pack-context';

import type { createServiceRoleClient } from '@/lib/supabase/server';
import type { NextResponse } from 'next/server';
import type { OpenResult, PackSource } from './types';

type ServiceDb = ReturnType<typeof createServiceRoleClient>;

interface PackJson {
  id: string;
  cards: { n: number; isNew: boolean }[];
}

/** What the player is told for each refusal (409, the state of his wallet did not allow it). */
const ERROR_NAME = {
  empty: 'empty', shards: 'shards', bonus: 'bonus', ad_limit: 'limit', ticket: 'ticket', timer_cap: 'timer_cap', focus_used: 'focus_used',
} as const;

export async function openPack(db: ServiceDb, userId: string, source: PackSource, ticket: string | null, focus: string | null = null): Promise<NextResponse> {
  const lim = limits();
  for (let attempt = 0; attempt < 2; attempt++) {
    // Lot 3: the draw knows the player (the Ultra Rare guarantee, the group halves he owns, the focus group).
    const ctx = await loadPackContext(db, userId, await loadPool(), focus);
    const cards = await drawServerPack({ ctx });
    const { data, error } = await db.rpc('cards_apply_pack', {
      p_user: userId,
      p_source: source,
      p_cards: cards,
      p_ticket: ticket,
      p_now: new Date().toISOString(),
      p_ads_limit: lim.ads,
      p_bonus_cap: lim.bonus,
      p_timer_cap: lim.timer,
      p_focus: focus,
    });
    if (!error && data) {
      const pack = data as PackJson;
      const state = await loadState(db, userId);
      const body: OpenResult = { pack: { id: pack.id, cards: pack.cards.map((c) => ({ n: c.n, isNew: c.isNew })) }, state };
      return json(body);
    }
    const why = refusalOf(error?.message);
    if (why === 'pack' && attempt === 0) {
      // The cached pool named a card that has just left the packs: reload it once and draw again.
      resetPoolCache();
      continue;
    }
    if (why === 'pity' && attempt === 0) {
      // Another pack of the player landed between the count and the store: count again and draw once more.
      continue;
    }
    if (why === 'focus') return json({ error: 'bad_request' }, 400);
    if (why && why in ERROR_NAME) return json({ error: ERROR_NAME[why as keyof typeof ERROR_NAME] }, 409);
    return json({ error: 'server' }, 500);
  }
  return json({ error: 'server' }, 500);
}
