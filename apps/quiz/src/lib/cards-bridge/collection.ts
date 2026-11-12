// Bunnyverse Cards, lane B, bridge 4: the Collection section of the passports (kpopquiz.org /me, hub /passport): cards owned of the total, both counted
// in the database. The one thing the passport pages import for it: a switch off (or any failure) answers null, and the page keeps its tree.
import { createServiceRoleClient } from '@/lib/supabase/server';

import { cardsBridgesHubOn, cardsBridgesKpopOn } from './flags';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Collection { owned: number; total: number }

export async function readCollection(userId: string, db: SupabaseClient = createServiceRoleClient()): Promise<Collection | null> {
  const [owned, total] = await Promise.all([
    db.from('cards_owned').select('card_no', { count: 'exact', head: true }).eq('user_id', userId).gt('copies', 0),
    db.from('cards_catalog').select('card_no', { count: 'exact', head: true }).eq('in_packs', true),
  ]);
  if (owned.error || total.error || owned.count === null || total.count === null || total.count < 1) return null;
  return { owned: owned.count, total: total.count };
}

async function load(on: boolean, userId: string): Promise<React.ReactElement | null> {
  if (!on) return null;
  try {
    const c = await readCollection(userId);
    if (!c) return null;
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
export const loadCollectionHub = (userId: string): Promise<React.ReactElement | null> => load(cardsBridgesHubOn(), userId);
