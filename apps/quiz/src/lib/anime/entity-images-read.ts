// Run O1 (ADM front): the server reads of the owner's images (public.entity_images, SQL 018 of part 1) for the display: the pictures of the
// series for the site layout, the pictures of the characters of one series for its hub and its personality page, and the rows of /credits.
// One cached read of the whole table (a few hundred small rows, paged past the 1000 row cap), tagged 'entity-images' so a write of
// part 1 can revalidate it; it also expires with the stats TTL. Any failure (the table is not there yet, the network) is an empty list:
// the pages then show the bundled photo or the placeholder, as they did before this lane.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { characterImageSlug, isLicenseCode, ownerCreditRows, ownerPictureOf } from './entity-images-rules';
import { setOwnerSeriesPictures } from './entity-images-store';

import type { EntityImage, OwnerCreditRow, OwnerPicture } from './entity-images-rules';

/** The tag a write of the admin API revalidates (part 1 also tags each slug: `entity-image:<kind>:<slug>`). */
export const ENTITY_IMAGES_TAG = 'entity-images';

/** The columns anon and authenticated may select (SQL 018). */
export const ENTITY_IMAGE_COLUMNS = 'kind, slug, path, width, height, focal_x, focal_y, source_url, author, license, license_note, updated_at';

export interface ImagesDb {
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the builder is untyped on this app's clients
}

/** Every image row of the anime site, or [] when the read fails. */
export async function loadEntityImageRows(db: ImagesDb): Promise<EntityImage[]> {
  try {
    const rows = await fetchAllRows<EntityImage>(() => forSite(db.from('entity_images').select(ENTITY_IMAGE_COLUMNS), 'anime').order('slug', { ascending: true }));
    return rows.filter((r) => (r.kind === 'series' || r.kind === 'character') && isLicenseCode(r.license) && typeof r.path === 'string' && r.path !== '');
  } catch (err) {
    console.error('[entity-images] read failed:', (err as Error)?.message ?? err);
    return [];
  }
}

export const getEntityImageRows = unstable_cache(
  async (): Promise<EntityImage[]> => {
    let db: ImagesDb;
    try {
      db = createPublicReadClient();
    } catch {
      return [];
    }
    return loadEntityImageRows(db);
  },
  ['db:anime:entity-images:v1'],
  { revalidate: CACHE_TTL.stats, tags: [ENTITY_IMAGES_TAG] },
);

/** The rows, or [] when the cached read itself fails (outside a request, a cache fault): a page never fails for a picture. */
async function safeRows(): Promise<EntityImage[]> {
  try {
    return await getEntityImageRows();
  } catch (err) {
    console.error('[entity-images] cache failed:', (err as Error)?.message ?? err);
    return [];
  }
}

/** The pictures of the series by slug. */
export function seriesPictures(rows: readonly EntityImage[]): Record<string, OwnerPicture> {
  const out: Record<string, OwnerPicture> = {};
  for (const r of rows) if (r.kind === 'series') out[r.slug] = ownerPictureOf(r);
  return out;
}

/** The pictures of the characters of one series, by the slug of the character. */
export function characterPictures(rows: readonly EntityImage[], seriesSlug: string): Record<string, OwnerPicture> {
  const out: Record<string, OwnerPicture> = {};
  const prefix = characterImageSlug(seriesSlug, '');
  for (const r of rows) if (r.kind === 'character' && r.slug.startsWith(prefix)) out[r.slug.slice(prefix.length)] = ownerPictureOf(r);
  return out;
}

/** Reads the series pictures and sets them for the server render (the site layout calls this first); returns them for the client island. */
export async function primeOwnerSeriesPictures(): Promise<Record<string, OwnerPicture>> {
  const map = seriesPictures(await safeRows());
  setOwnerSeriesPictures(map);
  return map;
}

export async function getOwnerCharacterPictures(seriesSlug: string): Promise<Record<string, OwnerPicture>> {
  return characterPictures(await safeRows(), seriesSlug);
}

export interface CreditNames { readonly series: Record<string, string>; readonly character: Record<string, string> }

/** The names the credits page prints, by series slug and by character key (only characters with no spoiler, spoiler_level 0: a locked character stays nameless). Empty on any failure. */
export async function loadCreditNames(db: ImagesDb): Promise<CreditNames> {
  const names: CreditNames = { series: {}, character: {} };
  try {
    const groups = (await forSite(db.from('groups').select('id, slug, name'), 'anime')) as { data: Array<{ id: number; slug: string; name: string }> | null };
    const bySlug = new Map<number, string>();
    for (const g of groups.data ?? []) { names.series[g.slug] = g.name; bySlug.set(g.id, g.slug); }
    const chars = await fetchAllRows<{ group_id: number; slug: string; name: string }>(() => db.from('characters').select('group_id, slug, name').eq('status', 'published').eq('spoiler_level', 0).order('id', { ascending: true }));
    for (const c of chars) {
      const s = bySlug.get(c.group_id);
      if (s) names.character[characterImageSlug(s, c.slug)] = c.name;
    }
  } catch (err) {
    console.error('[entity-images] names failed:', (err as Error)?.message ?? err);
  }
  return names;
}

export const getCreditNames = unstable_cache(
  async (): Promise<CreditNames> => {
    try { return await loadCreditNames(createPublicReadClient()); } catch { return { series: {}, character: {} }; }
  },
  ['db:anime:entity-image-names:v1'],
  { revalidate: CACHE_TTL.stats, tags: [ENTITY_IMAGES_TAG, 'groups'] },
);

/** The credit rows of every image the owner uploaded, for /credits (empty when there is none or the read fails). */
export async function getOwnerCreditRows(): Promise<OwnerCreditRow[]> {
  const rows = await safeRows();
  if (rows.length === 0) return [];
  const names = await getCreditNames().catch((): CreditNames => ({ series: {}, character: {} }));
  return ownerCreditRows(rows, names);
}
