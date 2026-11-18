// Bunnyverse Cards: the public catalog (GET /api/cards/catalog): every card in packs with its entity, photo credit and crop,
// read with the service role (the tables hold no browser grant), paged past the 1,000-row cap, cached for 5 minutes per instance.
// A card whose photo is not live (refused or removed) is out of packs (trigger cards_photo_retire) and therefore out of this list.
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { computeOdds } from './rules';

import type { CardImage, CardKind, CardPart, CatalogCard, CatalogEntity, CatalogPanorama, CatalogPayload, Edition, GroupParts, LockReason, PanoImage, PhotoCredit, PhotoSource, Rarity } from './types';

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
  /** age_lock comes with file 116 (lot 6): absent before it. */
  age_lock?: boolean | null;
}
interface PhotoRow {
  id: number; slot: number; source: PhotoSource; source_page: string; author: string; author_url: string | null; licence: string;
  licence_url: string; share_alike: boolean; modified: string; focal_x: number; focal_y: number; storage_path: string | null;
  source_path: string | null; file_focal_x: number | null; file_focal_y: number | null; small_2x: boolean;
  /** Lot 7 (file 118): the cards of the photo (null reads as 2), the parts its files were cut for (null reads as 2) and whether the panorama file exists. Absent before 118. */
  parts?: number | null; file_parts?: number | null; file_pano?: boolean | null;
}
/** Lot 7: a row of cards_panoramas (file 118). */
export interface PanoramaRow { pano_no: number; num: string; entity_id: string; rarity: Rarity; edition: Edition; photo_id: number | null; parts: number; first_card?: number }

const LOCKS = new Set<string>(['one', 'sameday', 'newg', 'hiatus', 'crop', 'photo', 'size']);
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
export type ImagePhotoRow = Pick<PhotoRow, 'focal_x' | 'focal_y' | 'storage_path' | 'source_path' | 'file_focal_x' | 'file_focal_y' | 'small_2x'> & Partial<Pick<PhotoRow, 'parts' | 'file_parts' | 'file_pano'>>;

/** A card_no row's part (lot 2, lot 7): 1 to 3 for a part of a group photo, else 0. */
export function partOf(v: unknown): CardPart {
  return v === 1 || v === 2 || v === 3 ? v : 0;
}

/** Lot 7: the number of cards of a photo, 2 or 3 (null or absent reads as 2: every photo of lots 2 to 6 is a pair). */
export const groupPartsOf = (v: unknown): GroupParts => (v === 3 ? 3 : 2);

/** The file stem suffix of a part: '' for a whole card, '-h1' and '-h2' for the halves of a pair (the owner's script writes <stem>-h1-1x.webp), '-t1' to '-t3'
 *  for the thirds of a photo in 3 cards (lot 7; scripts/cards/card-geometry.mjs partSuffix). */
export const partSuffix = (part: CardPart, parts: GroupParts = 2): string => (part === 0 || part > parts ? '' : `-${parts === 3 ? 't' : 'h'}${part}`);

/** Lot 7: the files of the photo were cut for the number of cards it has now (a photo cut as a pair then set to 3 cards has no thirds yet, and the reverse). */
const filesMatchParts = (p: ImagePhotoRow): boolean => groupPartsOf(p.file_parts) === groupPartsOf(p.parts);

/**
 * Lot 2: `card` is the cards_catalog row's part and small_2x. A half (part 1 or 2) uses the files of its side, and its own small_2x when
 * the row has one (each half of the 11:8.5 window is checked on its own); a whole card keeps the photo's.
 * Lot 7: a part 1 to 3 of a photo in 3 cards uses its third (-t1..-t3). A part's files count as cut only when the photo's file_parts equals its parts
 * (else the source photo is cropped in CSS, never a wrong file).
 */
export function cardImage(p: ImagePhotoRow, base?: string, card: { part?: number | null; small_2x?: boolean | null } = {}): CardImage {
  const part = partOf(card.part);
  const small2x = part !== 0 && typeof card.small_2x === 'boolean' ? card.small_2x : p.small_2x;
  const parts = groupPartsOf(p.parts);
  const partsOk = part === 0 || filesMatchParts(p);
  const cut = partsOk && p.storage_path !== null && p.file_focal_x === p.focal_x && p.file_focal_y === p.focal_y;
  const sourceUrl = p.source_path ? publicObjectUrl(p.source_path, base) : null;
  const common = {
    small2x, focalX: p.focal_x, focalY: p.focal_y, sourceUrl,
    fileFocalX: p.storage_path !== null ? p.file_focal_x : null, fileFocalY: p.storage_path !== null ? p.file_focal_y : null,
    ...(part !== 0 ? { part, parts } : {}),
  };
  // Lot 3: a photo with no bucket copy (every new photo) keeps showing its cut files while the owner moves its focal point, until the
  // script recuts them (the files are the old crop of the same photo).
  if (cut || (partsOk && p.storage_path !== null && !sourceUrl)) {
    const stem = `${p.storage_path}${partSuffix(part, parts)}`;
    return { url: cardImageUrl(`${stem}-1x.webp`, base), url2x: small2x ? null : cardImageUrl(`${stem}-2x.webp`, base), css: false, ...common };
  }
  return { url: sourceUrl, url2x: null, css: true, ...common };
}

/**
 * Lot 7: the picture of a panorama (the whole window of the photo). In this order: the panorama file <stem>-p<parts>-1x.webp (and its 2x when every part has
 * one) when the owner's script cut it for the photo's current focal point and parts; else the parts' 1x files left to right when they are cut; else the
 * source photo, to crop in CSS. A file cut for another number of parts, or at another focal point, is never used.
 */
export function panoImage(p: ImagePhotoRow, parts: GroupParts, someSmall2x: boolean, base?: string): PanoImage {
  const sourceUrl = p.source_path ? publicObjectUrl(p.source_path, base) : null;
  const fileOk = p.storage_path !== null && groupPartsOf(p.file_parts) === parts;
  const focalOk = p.file_focal_x === p.focal_x && p.file_focal_y === p.focal_y;
  const cut = fileOk && (focalOk || !sourceUrl);
  const small2x = someSmall2x || p.small_2x;
  const common = { sourceUrl, focalX: p.focal_x, focalY: p.focal_y, small2x };
  if (cut && p.file_pano === true) {
    const stem = `${p.storage_path}-p${parts}`;
    return { url: cardImageUrl(`${stem}-1x.webp`, base), url2x: small2x ? null : cardImageUrl(`${stem}-2x.webp`, base), partUrls: null, ...common };
  }
  if (cut) {
    const partUrls = Array.from({ length: parts }, (_, i) => cardImageUrl(`${p.storage_path}${partSuffix((i + 1) as CardPart, parts)}-1x.webp`, base));
    return { url: null, url2x: null, partUrls, ...common };
  }
  return { url: null, url2x: null, partUrls: null, ...common };
}

/** Builds the payload from the table reads (pure, tested without a database). */
export function buildCatalog(cards: CardRow[], entities: EntityRow[], photos: PhotoRow[], generatedAt: string, base?: string, locked: ReadonlySet<string> = new Set(), panoramaRows: readonly PanoramaRow[] | null = null, retiredRows: readonly CardRow[] = []): CatalogPayload {
  const ent = new Map(entities.map((e) => [e.id, e]));
  const photo = new Map(photos.map((p) => [p.id, p]));
  const outEntities: CatalogEntity[] = entities.map((e) => {
    const lockReasons: Partial<Record<Rarity, LockReason>> = {};
    for (const [k, v] of Object.entries(e.lock_reasons ?? {})) if (RAR.has(k) && LOCKS.has(v)) lockReasons[k as Rarity] = v as LockReason;
    return {
      id: e.id, kind: e.kind, name: e.name, groupId: e.group_id, group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : null,
      debutYear: e.debut_year, sortKey: e.sort_key, lockReasons, ...(typeof e.end_year === 'number' ? { endYear: e.end_year } : {}),
      ...(locked.has(e.id) ? { locked: true as const } : {}),
    };
  });
  const outCards: CatalogCard[] = [];
  // Lot 2: the other half of a pair is the card of the same subject, edition and the other part.
  // Lot 7: the parts of a photo, by subject, edition and part (the photo gives 2 or 3 cards).
  const halves = new Map<string, number>();
  for (const c of cards) if (partOf(c.part) !== 0 && !locked.has(c.entity_id)) halves.set(`${c.entity_id}|${c.rarity}|${partOf(c.part)}`, c.card_no);
  const setOf = (entity: string, rarity: Rarity, parts: GroupParts): number[] => {
    const ns: number[] = [];
    for (let i = 1; i <= parts; i++) { const n = halves.get(`${entity}|${rarity}|${i}`); if (n !== undefined) ns.push(n); }
    return ns;
  };
  // The panoramas whose every part is in packs and whose subject is not age-locked, by (entity, edition).
  const panoByKey = new Map<string, PanoramaRow>();
  for (const r of panoramaRows ?? []) {
    const parts = groupPartsOf(r.parts);
    if (locked.has(r.entity_id) || !ent.has(r.entity_id) || setOf(r.entity_id, r.rarity, parts).length !== parts) continue;
    panoByKey.set(`${r.entity_id}|${r.rarity}`, r);
  }
  for (const c of cards) {
    const e = ent.get(c.entity_id);
    if (!e) continue;
    // Lot 6: a locked subject has no card in the payload, whatever the database holds (fail closed).
    if (locked.has(c.entity_id)) continue;
    const p = c.photo_id === null ? undefined : photo.get(c.photo_id);
    const credit: PhotoCredit | null = p
      ? {
          id: p.id, slot: p.slot, author: p.author, authorUrl: p.author_url, licence: p.licence, licenceUrl: p.licence_url,
          source: p.source, sourcePage: p.source_page, shareAlike: p.share_alike, modified: p.modified,
        }
      : null;
    const part = partOf(c.part);
    const parts: GroupParts = p ? groupPartsOf(p.parts) : part === 3 ? 3 : 2;
    const pr = part !== 0 ? panoByKey.get(`${c.entity_id}|${c.rarity}`) : undefined;
    outCards.push({
      n: c.card_no, num: c.num, entity: c.entity_id, kind: e.kind, rarity: c.rarity, edition: c.edition, name: e.name,
      group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : e.kind === 'group' ? e.name : null,
      debutYear: e.debut_year, ...(typeof e.end_year === 'number' ? { endYear: e.end_year } : {}), photo: credit,
      image: p ? cardImage(p, base, c) : null,
      // pairN stays for a photo in 2 cards (the other half); a photo in 3 has none (setNs says every part).
      ...(part !== 0 ? { part, pairN: parts === 2 && part <= 2 ? (halves.get(`${c.entity_id}|${c.rarity}|${part === 1 ? 2 : 1}`) ?? null) : null, parts, setNs: setOf(c.entity_id, c.rarity, parts), ...(pr ? { pano: pr.pano_no } : {}) } : {}),
    });
  }
  const cardByN = new Map(cards.map((c) => [c.card_no, c]));
  const panoramas: CatalogPanorama[] | undefined = panoramaRows === null ? undefined : [...panoByKey.values()].sort((a, b) => a.pano_no - b.pano_no).map((r) => {
    const parts = groupPartsOf(r.parts);
    const ns = setOf(r.entity_id, r.rarity, parts);
    const p = r.photo_id === null ? undefined : photo.get(r.photo_id);
    const credit: PhotoCredit | null = p
      ? { id: p.id, slot: p.slot, author: p.author, authorUrl: p.author_url, licence: p.licence, licenceUrl: p.licence_url, source: p.source, sourcePage: p.source_page, shareAlike: p.share_alike, modified: p.modified }
      : null;
    return {
      p: r.pano_no, num: r.num, entity: r.entity_id, rarity: r.rarity, edition: r.edition, name: ent.get(r.entity_id)!.name, parts, cards: ns, photo: credit,
      image: p ? panoImage(p, parts, ns.some((n) => cardByN.get(n)?.small_2x === true), base) : null,
    };
  });
  // Owner decision 2026-11-18: a card out of packs (photo_id null or a photo no longer live) stays in the binder of the players who own it, as the
  // "New photo coming" frame. It is listed apart: it is not in `cards`, so it is never drawn, counted or in the odds. It carries no pair, no set, no
  // panorama (it is one frame); a card whose photo is live again (photo_id set and in packs) is in `cards` and is not listed here.
  const inPool = new Set(outCards.map((c) => c.n));
  const retired: CatalogCard[] = [];
  for (const c of retiredRows) {
    const e = ent.get(c.entity_id);
    if (!e || locked.has(c.entity_id) || inPool.has(c.card_no)) continue;
    const p = c.photo_id === null ? undefined : photo.get(c.photo_id);
    retired.push({
      n: c.card_no, num: c.num, entity: c.entity_id, kind: e.kind, rarity: c.rarity, edition: c.edition, name: e.name,
      group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : e.kind === 'group' ? e.name : null,
      debutYear: e.debut_year, ...(typeof e.end_year === 'number' ? { endYear: e.end_year } : {}),
      photo: p ? { id: p.id, slot: p.slot, author: p.author, authorUrl: p.author_url, licence: p.licence, licenceUrl: p.licence_url, source: p.source, sourcePage: p.source_page, shareAlike: p.share_alike, modified: p.modified } : null,
      image: p ? cardImage(p, base) : null, retired: true,
    });
  }
  const pool = outCards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity }));
  return { generatedAt, odds: pool.length > 0 ? computeOdds(pool) : null, cards: outCards, entities: outEntities, ...(panoramas ? { panoramas } : {}), ...(retired.length > 0 ? { retired } : {}) };
}

/** One row of cards_age_locks() (file 116). opens_month is read by the admin only: it never enters the payload. */
export interface AgeLockRow { entity_id: string; locked: boolean | null; opens_month?: string | null }

/**
 * The ids of the entities that are locked right now (lot 6). Only an entity with age_lock set can be locked. The database answers
 * (cards_age_locks()); a missing row, or an answer that did not come, locks it: fail closed. Before file 116 no row has age_lock.
 */
export function lockedIds(entities: readonly EntityRow[], answer: readonly AgeLockRow[] | null): Set<string> {
  const out = new Set<string>();
  const byId = new Map((answer ?? []).map((r) => [r.entity_id, r.locked]));
  for (const e of entities) {
    if (e.age_lock !== true) continue;
    if (answer === null || byId.get(e.id) !== false) out.add(e.id);
  }
  return out;
}

let cached: { at: number; payload: CatalogPayload } | null = null;

export async function loadCatalog(now: number = Date.now()): Promise<CatalogPayload> {
  if (cached && now - cached.at < CATALOG_TTL_MS) return cached.payload;
  const db = createServiceRoleClient();
  const [cards, entities, photos, retiredRows] = await Promise.all([
    fetchAllRows<CardRow>(() =>
      // '*': part and small_2x exist only once file 102 is applied; before it every card reads as a whole card.
      db.from('cards_catalog').select('*').eq('in_packs', true).order('card_no', { ascending: true })),
    fetchAllRows<EntityRow>(() =>
      // '*': end_year exists only once file 102 is applied.
      db.from('cards_entities').select('*').eq('active', true).order('id', { ascending: true })),
    fetchAllRows<PhotoRow>(() =>
      // '*': parts, file_parts and file_pano exist only once file 118 is applied (a missing column reads as a pair, no panorama file).
      db.from('cards_photos')
        .select('*')
        .in('status', ['auto', 'approved']).order('id', { ascending: true })),
    // The cards out of packs (owner decision 2026-11-18): a player who owns one keeps it in the binder. A failed read lists none: the catalog stays whole.
    fetchAllRows<CardRow>(() => db.from('cards_catalog').select('*').eq('in_packs', false).order('card_no', { ascending: true })).catch((): CardRow[] => []),
  ]);
  // Lot 6: the age lock is computed by the database at read time; the answer is cached with the catalog (5 minutes), so a pocket opens by itself.
  let answer: AgeLockRow[] | null = [];
  if (entities.some((e) => e.age_lock === true)) {
    const r = await db.rpc('cards_age_locks');
    answer = r.error || !Array.isArray(r.data) ? null : (r.data as AgeLockRow[]);
  }
  // Lot 7: the panoramas (file 118). A database without the table, or a failed read, answers no panorama: the catalog stays whole, never an error page.
  let panoramas: PanoramaRow[] | null = null;
  try {
    panoramas = await fetchAllRows<PanoramaRow>(() => db.from('cards_panoramas').select('*').order('pano_no', { ascending: true }));
  } catch {
    panoramas = null;
  }
  const payload = buildCatalog(cards, entities, photos, new Date(now).toISOString(), undefined, lockedIds(entities, answer), panoramas, retiredRows);
  cached = { at: now, payload };
  return payload;
}

export function resetCatalogCache(): void {
  cached = null;
}
