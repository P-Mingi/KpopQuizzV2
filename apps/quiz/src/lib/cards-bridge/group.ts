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
  /** Lot 2: 1 or 2 for a half of a group photo (absent for a whole card). */
  part?: 1 | 2 | 3;
  /** Lot 7: the number of cards of the photo (2 or 3), with `part`. Only set for a photo in 3 (absent reads as 2, as every pair did before lot 7). */
  parts?: 2 | 3;
  /** Lot 2: with `part`, true when photoUrl is the whole source photo (no half file cut yet): the tile shows its half of the 11:8.5 window in CSS. */
  css?: boolean;
}

interface EntityRow { id: string; name: string }
interface CatalogRow { card_no: number; num: string; entity_id: string; rarity: string; photo_id: number | null; part?: number | null; small_2x?: boolean | null }
type PhotoRow = ImagePhotoRow & { id: number };

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** The binder's and the hub idol page's slug of a name (the same function as slugOf of lib/cards/kc-idol.ts, copied so this file imports nothing of the Cards pages; a test pins them equal). */
export const slugOf = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
  const cat = await db.from('cards_catalog').select('*').eq('in_packs', true).in('entity_id', [...names.keys()]).order('card_no').limit(1000);
  if (cat.error || !cat.data?.length) return [];
  const rows = cat.data as CatalogRow[];
  const ids = [...new Set(rows.flatMap((r) => (r.photo_id === null ? [] : [r.photo_id])))];
  const ph = ids.length
    ? await db.from('cards_photos').select('*').in('id', ids).in('status', ['auto', 'approved']).limit(1000)
    : { data: [], error: null };
  if (ph.error) return [];
  const photos = new Map((ph.data as PhotoRow[]).map((p) => [p.id, p]));
  const { cardImage } = await import('@/lib/cards/catalog');
  // A card whose photo was removed or rejected is retired from the page, like from the packs.
  return rows.flatMap((r) => {
    const p = r.photo_id === null ? undefined : photos.get(r.photo_id);
    if (!p) return [];
    const img = cardImage(p, base, r);
    // '*' (the catalog rows and the photos) so part, small_2x and, with file 118, parts and file_parts come once they exist; before, every row is a whole card or a pair.
    return [{ n: r.card_no, num: r.num, name: names.get(r.entity_id) ?? '', rarity: r.rarity, photoUrl: img.url, focalX: img.focalX, focalY: img.focalY, ...(img.part === 1 || img.part === 2 || img.part === 3 ? { part: img.part, ...(img.parts === 3 ? { parts: 3 as const } : {}), css: img.css === true } : {}) }];
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

/**
 * The slug of this page's section of the hub binder (/kpopcards/collection/<section>), or null. The binder files a group under the slug of its
 * group card's name, and a soloist without a group line under "soloists" (lib/cards/ui-model.ts). null on any failure or for a page the
 * catalog does not know: the block then keeps its link to the whole binder, never a path that could 404.
 */
export async function readGroupCollection(slug: string, db: SupabaseClient = createServiceRoleClient()): Promise<string | null> {
  if (!SLUG.test(slug)) return null;
  const ents = await db.from('cards_entities').select('id,name,group_id').eq('active', true).or(`id.eq.group:${slug},id.eq.idol:${slug}`).limit(10);
  if (ents.error || !ents.data?.length) return null;
  const rows = ents.data as Array<EntityRow & { group_id: string | null }>;
  const group = rows.find((r) => r.id === `group:${slug}`);
  if (group) return slugOf(group.name) || null;
  const solo = rows.find((r) => r.id === `idol:${slug}` && r.group_id === null);
  return solo ? 'soloists' : null;
}

export interface IdolCards {
  /** The hub's page of the idol: /kpopcards/idol/<this>. */
  slug: string;
  name: string;
  /** Real cards of the idol (in packs, with a photo that is still in use). */
  count: number;
}

/** The cards of one idol of a group page, found by the stage name the hub's idol page uses. null when the idol has none (then no link). */
export async function readIdolCards(groupSlug: string, idolName: string, idolPageSlug: string, db: SupabaseClient = createServiceRoleClient()): Promise<IdolCards | null> {
  if (!SLUG.test(groupSlug) || !SLUG.test(idolPageSlug)) return null;
  const target = slugOf(idolName);
  if (!target) return null;
  const ents = await db.from('cards_entities').select('id,name').eq('active', true).or(`group_id.eq.group:${groupSlug},id.eq.idol:${idolPageSlug}`).limit(1000);
  if (ents.error || !ents.data?.length) return null;
  const mine = (ents.data as EntityRow[]).filter((e) => e.id.startsWith('idol:') && slugOf(e.name) === target);
  if (!mine.length) return null;
  const cat = await db.from('cards_catalog').select('card_no,entity_id,photo_id').eq('in_packs', true).in('entity_id', mine.map((e) => e.id)).order('card_no').limit(1000);
  if (cat.error || !cat.data?.length) return null;
  const rows = cat.data as Array<{ card_no: number; entity_id: string; photo_id: number | null }>;
  const ids = [...new Set(rows.flatMap((r) => (r.photo_id === null ? [] : [r.photo_id])))];
  if (!ids.length) return null;
  const ph = await db.from('cards_photos').select('id').in('id', ids).in('status', ['auto', 'approved']).limit(1000);
  if (ph.error) return null;
  const live = new Set((ph.data as Array<{ id: number }>).map((p) => p.id));
  // The hub's idol page shows the first entity of that name; its cards are the ones counted.
  const first = rows.find((r) => r.photo_id !== null && live.has(r.photo_id));
  if (!first) return null;
  const count = rows.filter((r) => r.entity_id === first.entity_id && r.photo_id !== null && live.has(r.photo_id)).length;
  return { slug: target, name: mine.find((e) => e.id === first.entity_id)?.name ?? idolName, count };
}

/** The "{Idol} cards" link of one idol page, ready to place, or null: then the page renders exactly the tree it renders without this file. */
export async function loadCardsIdol(group: { readonly slug: string }, idol: { readonly name: string; readonly slug: string }): Promise<React.ReactElement | null> {
  if (!cardsBridgesKpopOn()) return null;
  try {
    const found = await readIdolCards(group.slug, idol.name, idol.slug);
    if (!found) return null;
    const { cardsIdol } = await import('@/components/cards-bridge/cards-idol');
    return cardsIdol(found);
  } catch (err) {
    console.error('[idol-page] Cards link hidden:', (err as Error)?.message ?? err);
    return null;
  }
}
