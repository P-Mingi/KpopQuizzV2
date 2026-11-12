// Bunnyverse Cards: the public catalog (GET /api/cards/catalog): every card in packs with its entity, photo credit and crop,
// read with the service role (the tables hold no browser grant), paged past the 1,000-row cap, cached for 5 minutes per instance.
// A card whose photo is not live (refused or removed) is out of packs (trigger cards_photo_retire) and therefore out of this list.
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { computeOdds } from './rules';

import type { CardImage, CardKind, CardPart, CatalogCard, CatalogEntity, CatalogPayload, Edition, LockReason, PhotoCredit, PhotoSource, Rarity } from './types';

export const CATALOG_TTL_MS = 5 * 60 * 1000;

/** part and small_2x come with file 102 (lot 2): absent on a database where 102 is not applied, then every card is a whole card. */
interface CardRow {
  card_no: number; num: string; entity_id: string; rarity: Rarity; edition: Edition; photo_id: number | null;
  part?: number | null; small_2x?: boolean | null;
}
/** end_year comes with file 102 (lot 2): absent before it. */
interface EntityRow {
  id: string; kind: CardKind; name: string; group_id: string | null; debut_year: number | null; sort_key: string;
  lock_reasons: Record<string, string> | null; end_year?: number | null;
}
interface PhotoRow {
  id: number; slot: number; source: PhotoSource; source_page: string; author: string; author_url: string | null; licence: string;
  licence_url: string; share_alike: boolean; modified: string; focal_x: number; focal_y: number; storage_path: string | null;
  source_path: string | null; file_focal_x: number | null; file_focal_y: number | null; small_2x: boolean;
}

const LOCKS = new Set<string>(['one', 'sameday', 'newg', 'hiatus', 'crop']);
const RAR = new Set<string>(['C', 'U', 'R', 'SR', 'UR', 'L']);

/** The public URL of a file of the 'cards' bucket (003-rls.sql). */
export function cardImageUrl(path: string, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  return `${(base ?? '').replace(/\/+$/, '')}/storage/v1/object/public/cards/${path}`;
}

/** The public URL of a file of any public bucket, given 'bucket/path' (cards_photos.source_path, e.g. images/group-photos/jennie.jpg). */
export function publicObjectUrl(bucketPath: string, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  return `${(base ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${bucketPath}`;
}

/**
 * The art of a card (amendment 1): the 'cards' bucket WebP (storage_path is the stem, files <stem>-1x.webp 320x495 and <stem>-2x.webp
 * 640x989) when the owner's script cut it at the current focal point (file_focal equals focal); otherwise the source photo with the
 * focal point, to crop in CSS. Never broken: with neither a file nor a source, url is null.
 */
/** The photo columns cardImage reads (lib/cards-bridge/group.ts reads only these). */
export type ImagePhotoRow = Pick<PhotoRow, 'focal_x' | 'focal_y' | 'storage_path' | 'source_path' | 'file_focal_x' | 'file_focal_y' | 'small_2x'>;

/** A card_no row's part (lot 2): 1 or 2 for a half of a group photo, else 0. */
export function partOf(v: unknown): CardPart {
  return v === 1 || v === 2 ? v : 0;
}

/** The file stem suffix of a part: '' for a whole card, '-h1' and '-h2' for the halves (the owner's script writes <stem>-h1-1x.webp). */
export const partSuffix = (part: CardPart): string => (part === 0 ? '' : `-h${part}`);

/**
 * Lot 2: `card` is the cards_catalog row's part and small_2x. A half (part 1 or 2) uses the files of its side, and its own small_2x when
 * the row has one (each half of the 11:8.5 window is checked on its own); a whole card keeps the photo's.
 */
export function cardImage(p: ImagePhotoRow, base?: string, card: { part?: number | null; small_2x?: boolean | null } = {}): CardImage {
  const part = partOf(card.part);
  const small2x = part !== 0 && typeof card.small_2x === 'boolean' ? card.small_2x : p.small_2x;
  const cut = p.storage_path !== null && p.file_focal_x === p.focal_x && p.file_focal_y === p.focal_y;
  const sourceUrl = p.source_path ? publicObjectUrl(p.source_path, base) : null;
  const common = {
    small2x, focalX: p.focal_x, focalY: p.focal_y, sourceUrl,
    fileFocalX: p.storage_path !== null ? p.file_focal_x : null, fileFocalY: p.storage_path !== null ? p.file_focal_y : null,
    ...(part !== 0 ? { part } : {}),
  };
  if (cut) {
    const stem = `${p.storage_path}${partSuffix(part)}`;
    return { url: cardImageUrl(`${stem}-1x.webp`, base), url2x: small2x ? null : cardImageUrl(`${stem}-2x.webp`, base), css: false, ...common };
  }
  return { url: sourceUrl, url2x: null, css: true, ...common };
}

/** Builds the payload from the three table reads (pure, tested without a database). */
export function buildCatalog(cards: CardRow[], entities: EntityRow[], photos: PhotoRow[], generatedAt: string, base?: string): CatalogPayload {
  const ent = new Map(entities.map((e) => [e.id, e]));
  const photo = new Map(photos.map((p) => [p.id, p]));
  const outEntities: CatalogEntity[] = entities.map((e) => {
    const lockReasons: Partial<Record<Rarity, LockReason>> = {};
    for (const [k, v] of Object.entries(e.lock_reasons ?? {})) if (RAR.has(k) && LOCKS.has(v)) lockReasons[k as Rarity] = v as LockReason;
    return {
      id: e.id, kind: e.kind, name: e.name, groupId: e.group_id, group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : null,
      debutYear: e.debut_year, sortKey: e.sort_key, lockReasons, ...(typeof e.end_year === 'number' ? { endYear: e.end_year } : {}),
    };
  });
  const outCards: CatalogCard[] = [];
  // Lot 2: the other half of a pair is the card of the same subject, edition and the other part.
  const halves = new Map<string, number>();
  for (const c of cards) if (partOf(c.part) !== 0) halves.set(`${c.entity_id}|${c.rarity}|${partOf(c.part)}`, c.card_no);
  for (const c of cards) {
    const e = ent.get(c.entity_id);
    if (!e) continue;
    const p = c.photo_id === null ? undefined : photo.get(c.photo_id);
    const credit: PhotoCredit | null = p
      ? {
          id: p.id, slot: p.slot, author: p.author, authorUrl: p.author_url, licence: p.licence, licenceUrl: p.licence_url,
          source: p.source, sourcePage: p.source_page, shareAlike: p.share_alike, modified: p.modified,
        }
      : null;
    const part = partOf(c.part);
    outCards.push({
      n: c.card_no, num: c.num, entity: c.entity_id, kind: e.kind, rarity: c.rarity, edition: c.edition, name: e.name,
      group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : e.kind === 'group' ? e.name : null,
      debutYear: e.debut_year, ...(typeof e.end_year === 'number' ? { endYear: e.end_year } : {}), photo: credit,
      image: p ? cardImage(p, base, c) : null,
      ...(part !== 0 ? { part, pairN: halves.get(`${c.entity_id}|${c.rarity}|${part === 1 ? 2 : 1}`) ?? null } : {}),
    });
  }
  const pool = outCards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity }));
  return { generatedAt, odds: pool.length > 0 ? computeOdds(pool) : null, cards: outCards, entities: outEntities };
}

let cached: { at: number; payload: CatalogPayload } | null = null;

export async function loadCatalog(now: number = Date.now()): Promise<CatalogPayload> {
  if (cached && now - cached.at < CATALOG_TTL_MS) return cached.payload;
  const db = createServiceRoleClient();
  const [cards, entities, photos] = await Promise.all([
    fetchAllRows<CardRow>(() =>
      // '*': part and small_2x exist only once file 102 is applied; before it every card reads as a whole card.
      db.from('cards_catalog').select('*').eq('in_packs', true).order('card_no', { ascending: true })),
    fetchAllRows<EntityRow>(() =>
      // '*': end_year exists only once file 102 is applied.
      db.from('cards_entities').select('*').eq('active', true).order('id', { ascending: true })),
    fetchAllRows<PhotoRow>(() =>
      db.from('cards_photos')
        .select('id, slot, source, source_page, author, author_url, licence, licence_url, share_alike, modified, focal_x, focal_y, storage_path, source_path, file_focal_x, file_focal_y, small_2x')
        .in('status', ['auto', 'approved']).order('id', { ascending: true })),
  ]);
  const payload = buildCatalog(cards, entities, photos, new Date(now).toISOString());
  cached = { at: now, payload };
  return payload;
}

export function resetCatalogCache(): void {
  cached = null;
}
