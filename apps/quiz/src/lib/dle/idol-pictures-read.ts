// Kpopdle (idol): the server reads behind idol-pictures.ts. One cached read of the KpopCards rows of the pool's idols (service role: the cards tables have no browser grant, as for
// lib/cards/catalog.ts), the verified trivia pictures and the pool through their own cached reads. Resolved on the server, so a tile costs no request of its own. Fail soft: any failure
// answers the trivia pictures alone, or nothing, and the tiles keep their initials; a failed read is never kept by the cache.
import { unstable_cache } from 'next/cache';

import { lockedIds } from '@/lib/cards/catalog';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getPublicPictures } from '@/lib/photos/public-read';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { EMPTY_IDOL_PICTURES, resolveIdolPictures } from './idol-pictures';
import { getDlePool } from './read';

import type { AgeLockRow } from '@/lib/cards/catalog';
import type { CardsEntityRow, CardsPhotoRow, IdolPictureSet, PoolIdol } from './idol-pictures';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

export const IDOL_PICTURES_TTL = 300;
const GAME = 'kpopdle-idol';
const CHUNK = 80;

export interface CardsRows {
  readonly entities: readonly CardsEntityRow[];
  readonly photos: readonly CardsPhotoRow[];
  readonly locked: readonly string[];
}

const chunks = <T,>(xs: readonly T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** The Wikidata id of each pool idol (public.idols.wikidata_qid), by id; an idol with none is absent. */
export async function readIdolQids(db: Db, ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const numeric = ids.filter((i) => /^[0-9]+$/.test(i)).map(Number);
  for (const part of chunks(numeric, CHUNK)) {
    const rows = await fetchAllRows<{ id: number; wikidata_qid: string | null }>(() => db.from('idols').select('id, wikidata_qid').in('id', part).order('id', { ascending: true }));
    for (const r of rows) if (typeof r.wikidata_qid === 'string' && /^Q[0-9]+$/.test(r.wikidata_qid)) out.set(String(r.id), r.wikidata_qid);
  }
  return out;
}

/** The card subjects of these Wikidata ids and their live photos, with the ids that are age-locked right now. Throws on a failed read. */
export async function readCardsRows(db: Db, qids: readonly string[]): Promise<CardsRows> {
  const entities: CardsEntityRow[] = [];
  for (const part of chunks(qids, CHUNK)) {
    // '*': age_lock exists only once file 116 is applied.
    entities.push(...await fetchAllRows<CardsEntityRow>(() => db.from('cards_entities').select('*').eq('kind', 'idol').eq('active', true).in('qid', part).order('id', { ascending: true })));
  }
  const photos: CardsPhotoRow[] = [];
  for (const part of chunks(entities.map((e) => e.id), CHUNK)) {
    photos.push(...await fetchAllRows<CardsPhotoRow>(() => db.from('cards_photos')
      .select('id, entity_id, slot, status, source_page, author, author_url, licence, licence_url, share_alike, focal_x, focal_y, storage_path, source_path, file_focal_x, file_focal_y, small_2x')
      .in('entity_id', part).in('status', ['auto', 'approved']).order('id', { ascending: true })));
  }
  // The age lock is the database's answer at read time; an answer that did not come locks every subject that has the flag (lockedIds).
  let answer: AgeLockRow[] | null = [];
  if (entities.some((e) => e.age_lock === true)) {
    const r = await db.rpc('cards_age_locks');
    answer = r.error || !Array.isArray(r.data) ? null : (r.data as AgeLockRow[]);
  }
  const locked = [...lockedIds(entities.map((e) => ({ id: e.id, kind: 'idol' as const, name: e.name, group_id: null, debut_year: null, sort_key: '', lock_reasons: null, age_lock: e.age_lock ?? null })), answer)];
  return { entities, photos, locked };
}

/** True for the answer of a table that is not there yet (cards not applied): the pictures then come from the trivia alone. */
function isMissingTable(err: unknown): boolean {
  return /could not find the table|does not exist|PGRST205|42P01/i.test(String((err as Error)?.message ?? err));
}

const cardsCached = unstable_cache(
  async (qids: string[]): Promise<CardsRows> => {
    try {
      return await readCardsRows(createServiceRoleClient(), qids);
    } catch (err) {
      if (isMissingTable(err)) return { entities: [], photos: [], locked: [] };
      throw err;
    }
  },
  ['db:hub:kpopdle-idol-cards:v1'],
  { revalidate: IDOL_PICTURES_TTL, tags: ['dle', 'cards'] },
);

const qidsCached = unstable_cache(
  async (ids: string[]): Promise<[string, string][]> => [...(await readIdolQids(createServiceRoleClient(), ids)).entries()],
  ['db:hub:kpopdle-idol-qids:v1'],
  { revalidate: IDOL_PICTURES_TTL, tags: ['dle'] },
);

/**
 * The pictures of the Kpopdle idols: trivia first, then KpopCards, else nothing. Empty on a failed read of the pool; the trivia alone when the cards rows cannot be read.
 */
export async function getKpopdleIdolPictures(): Promise<IdolPictureSet> {
  try {
    const [pool, pictures] = await Promise.all([getDlePool(GAME), getPublicPictures()]);
    if (!pool) return EMPTY_IDOL_PICTURES;
    const trivia = pictures.filter((p) => p.kind === 'idol');
    const ids = pool.entities.map((e) => e.id);
    let qids = new Map<string, string>();
    let rows: CardsRows = { entities: [], photos: [], locked: [] };
    try {
      qids = new Map(await qidsCached(ids));
      const wanted = [...new Set(qids.values())].sort();
      rows = wanted.length ? await cardsCached(wanted) : rows;
    } catch (err) {
      console.error('[dle] kpopdle idol cards read failed:', (err as Error)?.message ?? err);
    }
    const idols: PoolIdol[] = pool.entities.map((e) => ({ id: e.id, name: e.name, thumb: e.thumb, qid: qids.get(e.id) ?? null }));
    return resolveIdolPictures({
      idols, trivia, entities: rows.entities, photos: rows.photos, locked: new Set(rows.locked),
      base: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err) {
    console.error('[dle] kpopdle idol pictures failed:', (err as Error)?.message ?? err);
    return EMPTY_IDOL_PICTURES;
  }
}

/** Does any KpopCards photo of the Kpopdle tiles need a credit? (The footer's Credits link of the hub.) False on any failure. */
export async function kpopdleHasCardCredits(): Promise<boolean> {
  return (await getKpopdleIdolPictures()).credits.length > 0;
}
