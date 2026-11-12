// Bunnyverse Cards, lane B, bridge 2: "BLACKPINK cards" on a kpopquiz.org group page (owner decision 15). The one thing the group hub imports for
// it, in the shape of lib/passerelles/group-line.ts: NET_CARDS_BRIDGES off loads nothing (no read, no component, no style) and the page keeps its
// bytes; any error reads as no block. The cards come from the public catalog (cards_entities, cards_catalog, cards_photos) by the page's slug,
// the key 101-catalog.sql gives them (review 1 finding 3): the group card 'group:<slug>', the person of a soloist's own page 'idol:<slug>',
// and every soloist or member whose card group line is this group (group_id 'group:<slug>'). The art is cardImage() of lib/cards/catalog.ts,
// the same picture as on Bunnyverse: the cut card file at the current focal point, else the source photo cropped in CSS at that point.
// A group with no card gets no block (no dead door, no empty claim).
import { createServiceRoleClient } from '@/lib/supabase/server';

import { cardsBridgesKpopOn } from './flags';

import type { ImagePhotoRow } from '@/lib/cards/catalog';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroupCard {
  n: number;
  num: string;
  name: string;
  rarity: string;
  /** Public URL of the card art, shown only for an owned card. */
  photoUrl: string | null;
  /** object-position of the cover crop, 0 to 100 (the photo's focal point). */
  focalX: number;
  focalY: number;
}

interface EntityRow { id: string; name: string }
interface CatalogRow { card_no: number; num: string; entity_id: string; rarity: string; photo_id: number | null }
type PhotoRow = ImagePhotoRow & { id: number };

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function photoPublicUrl(base: string | undefined, path: string | null): string | null {
  if (!base || !path || path.includes('..') || path.startsWith('/')) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/cards/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** The group's cards (its group card, and the cards of the people whose group line it is), in set order. Empty on any failure. */
export async function readGroupCards(slug: string, db: SupabaseClient = createServiceRoleClient(), base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): Promise<GroupCard[]> {
  if (!SLUG.test(slug)) return [];
  const gid = `group:${slug}`;
  const ents = await db.from('cards_entities').select('id,name').eq('active', true).or(`id.eq.${gid},id.eq.idol:${slug},group_id.eq.${gid}`).limit(1000);
  if (ents.error || !ents.data?.length) return [];
  const entities = ents.data as EntityRow[];
  const names = new Map(entities.map((e) => [e.id, e.name]));
  const cat = await db.from('cards_catalog').select('card_no,num,entity_id,rarity,photo_id').eq('in_packs', true).in('entity_id', [...names.keys()]).order('card_no').limit(1000);
  if (cat.error || !cat.data?.length) return [];
  const rows = cat.data as CatalogRow[];
  const ids = [...new Set(rows.flatMap((r) => (r.photo_id === null ? [] : [r.photo_id])))];
  const ph = ids.length
    ? await db.from('cards_photos').select('id,focal_x,focal_y,storage_path,source_path,file_focal_x,file_focal_y,small_2x').in('id', ids).in('status', ['auto', 'approved']).limit(1000)
    : { data: [], error: null };
  if (ph.error) return [];
  const photos = new Map((ph.data as PhotoRow[]).map((p) => [p.id, p]));
  const { cardImage } = await import('@/lib/cards/catalog');
  // A card whose photo was removed or rejected is retired from the page, like from the packs.
  return rows.flatMap((r) => {
    const p = r.photo_id === null ? undefined : photos.get(r.photo_id);
    if (!p) return [];
    const img = cardImage(p, base);
    return [{ n: r.card_no, num: r.num, name: names.get(r.entity_id) ?? '', rarity: r.rarity, photoUrl: img.url, focalX: img.focalX, focalY: img.focalY }];
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
