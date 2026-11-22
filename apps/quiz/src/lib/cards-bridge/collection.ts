// Bunnyverse Cards, lane B, bridge 4: the Collection section of the passports (kpopquiz.org /me, hub /passport): cards owned of the total, both counted
// in the database. The one thing the passport pages import for it: a switch off (or any failure) answers null, and the page keeps its tree.
import { createServiceRoleClient } from '@/lib/supabase/server';

import { cardsBridgesHubOn, cardsBridgesKpopOn } from './flags';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Collection { owned: number; total: number }

/**
 * Owned of total, among the cards of the catalog (entity active). Owner decision 2026-11-18: a card the player owns whose photo left (out of packs) keeps
 * counting, so his owned has it and so has his total: total = the cards in packs + his own cards out of packs. The line never says 61 of 60, and a removal
 * never lowers it. A card out of packs that he does not own is in nobody's total.
 */
export async function readCollection(userId: string, db: SupabaseClient = createServiceRoleClient()): Promise<Collection | null> {
  const [owned, retired, live] = await Promise.all([
    db.from('cards_owned').select('card_no, cards_catalog!inner(in_packs, cards_entities!inner(active))', { count: 'exact', head: true })
      .eq('user_id', userId).gt('copies', 0).eq('cards_catalog.cards_entities.active', true),
    db.from('cards_owned').select('card_no, cards_catalog!inner(in_packs, cards_entities!inner(active))', { count: 'exact', head: true })
      .eq('user_id', userId).gt('copies', 0).eq('cards_catalog.in_packs', false).eq('cards_catalog.cards_entities.active', true),
    db.from('cards_catalog').select('card_no, cards_entities!inner(active)', { count: 'exact', head: true })
      .eq('in_packs', true).eq('cards_entities.active', true),
  ]);
  if (owned.error || retired.error || live.error || owned.count === null || retired.count === null || live.count === null || live.count < 1) return null;
  return { owned: owned.count, total: live.count + retired.count };
}

async function load(on: boolean, userId: string, hub = false): Promise<React.ReactElement | null> {
  if (!on) return null;
  try {
    const c = await readCollection(userId);
    if (!c) return null;
    // Owner, 2026-11-22 (the passport redesign): the hub passport draws the same two numbers as a card of its own.
    if (hub) return (await import('@/components/hub/hub-passport-collection')).hubCollectionCard(c);
    const { collectionSection } = await import('@/components/cards-bridge/collection-section');
    return collectionSection(c);
  } catch (err) {
    console.error('[passport] Collection hidden:', (err as Error)?.message ?? err);
    return null;
  }
}

/** kpopquiz.org /me. */
export const loadCollectionKpop = (userId: string): Promise<React.ReactElement | null> => load(cardsBridgesKpopOn(), userId);
/** bunnyverse.org /passport. */
export const loadCollectionHub = (userId: string): Promise<React.ReactElement | null> => load(cardsBridgesHubOn(), userId, true);
