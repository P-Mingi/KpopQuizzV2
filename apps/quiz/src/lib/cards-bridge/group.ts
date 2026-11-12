// Bunnyverse Cards, lane B, bridge 2: "BLACKPINK cards" on a kpopquiz.org group page (owner decision 15). The one thing the group hub imports for
// it, in the shape of lib/passerelles/group-line.ts: NET_CARDS_BRIDGES off loads nothing (no read, no component, no style) and the page keeps its
// bytes; any error reads as no block. The cards come from the public catalog (cards_entities, cards_catalog, cards_photos) by the group's Wikidata
// id (src/data/wikidata-groups.json); a group with no card, or no id, gets no block (no dead door, no empty claim).
import { wikidataGroup } from '@/lib/seo/wikidata';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { cardsBridgesKpopOn } from './flags';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroupCard {
  n: number;
  num: string;
  name: string;
  rarity: string;
  /** Public URL of the card photo, shown only for an owned card. */
  photoUrl: string | null;
}

interface EntityRow { id: string; name: string }
interface CatalogRow { card_no: number; num: string; entity_id: string; rarity: string; photo_id: number | null }
interface PhotoRow { id: number; storage_path: string | null }

export function photoPublicUrl(base: string | undefined, path: string | null): string | null {
  if (!base || !path || path.includes('..') || path.startsWith('/')) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/cards/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** The group's cards (its group card and its idols' cards), in set order. Empty on any failure. */
export async function readGroupCards(slug: string, db: SupabaseClient = createServiceRoleClient(), base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): Promise<GroupCard[]> {
  const g = wikidataGroup(slug);
  if (!g) return [];
  const gid = `group:${g.qid}`;
  const ents = await db.from('cards_entities').select('id,name').eq('active', true).or(`id.eq.${gid},group_id.eq.${gid}`).limit(1000);
  if (ents.error || !ents.data?.length) return [];
  const entities = ents.data as EntityRow[];
  const names = new Map(entities.map((e) => [e.id, e.name]));
  const cat = await db.from('cards_catalog').select('card_no,num,entity_id,rarity,photo_id').eq('in_packs', true).in('entity_id', [...names.keys()]).order('card_no').limit(1000);
  if (cat.error || !cat.data?.length) return [];
  const rows = cat.data as CatalogRow[];
  const ids = [...new Set(rows.flatMap((r) => (r.photo_id === null ? [] : [r.photo_id])))];
  const ph = ids.length ? await db.from('cards_photos').select('id,storage_path').in('id', ids).in('status', ['auto', 'approved']).limit(1000) : { data: [], error: null };
  if (ph.error) return [];
  const photos = new Map((ph.data as PhotoRow[]).map((p) => [p.id, p.storage_path]));
  // A card whose photo was removed or rejected is retired from the page, like from the packs.
  return rows.flatMap((r) => {
    if (r.photo_id === null || !photos.has(r.photo_id)) return [];
    return [{ n: r.card_no, num: r.num, name: names.get(r.entity_id) ?? '', rarity: r.rarity, photoUrl: photoPublicUrl(base, photos.get(r.photo_id) ?? null) }];
  });
}

/** The block of one group, ready to place in the page, or null: then the hub renders exactly the tree it renders without this file. */
export async function loadCardsGroup(group: { readonly name: string; readonly slug: string }): Promise<React.ReactElement | null> {
  if (!cardsBridgesKpopOn()) return null;
  try {
    const { cardsGroup } = await import('@/components/cards-bridge/cards-group');
    return await cardsGroup(group.name, group.slug);
  } catch (err) {
    console.error('[group-hub] Cards block hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
