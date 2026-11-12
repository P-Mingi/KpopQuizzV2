// Bunnyverse Cards: the public catalog (GET /api/cards/catalog): every card in packs with its entity, photo credit and crop,
// read with the service role (the tables hold no browser grant), paged past the 1,000-row cap, cached for 5 minutes per instance.
// A card whose photo is not live (refused or removed) is out of packs (trigger cards_photo_retire) and therefore out of this list.
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { CardKind, CatalogCard, CatalogEntity, CatalogPayload, Edition, LockReason, PhotoCredit, PhotoSource, Rarity } from './types';

export const CATALOG_TTL_MS = 5 * 60 * 1000;

interface CardRow { card_no: number; num: string; entity_id: string; rarity: Rarity; edition: Edition; photo_id: number | null }
interface EntityRow {
  id: string; kind: CardKind; name: string; group_id: string | null; debut_year: number | null; sort_key: string;
  lock_reasons: Record<string, string> | null;
}
interface PhotoRow {
  id: number; slot: number; source: PhotoSource; source_page: string; author: string; author_url: string | null; licence: string;
  licence_url: string; share_alike: boolean; modified: string; focal_x: number; focal_y: number; storage_path: string | null;
}

const LOCKS = new Set<string>(['one', 'sameday', 'newg', 'hiatus', 'crop']);
const RAR = new Set<string>(['C', 'U', 'R', 'SR', 'UR', 'L']);

/** The public URL of a file of the 'cards' bucket (003-rls.sql). */
export function cardImageUrl(path: string, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  return `${(base ?? '').replace(/\/+$/, '')}/storage/v1/object/public/cards/${path}`;
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
      debutYear: e.debut_year, sortKey: e.sort_key, lockReasons,
    };
  });
  const outCards: CatalogCard[] = [];
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
    outCards.push({
      n: c.card_no, num: c.num, entity: c.entity_id, kind: e.kind, rarity: c.rarity, edition: c.edition, name: e.name,
      group: e.group_id ? (ent.get(e.group_id)?.name ?? null) : e.kind === 'group' ? e.name : null,
      debutYear: e.debut_year, photo: credit,
      image: p ? { url: p.storage_path ? cardImageUrl(p.storage_path, base) : null, focalX: p.focal_x, focalY: p.focal_y } : null,
    });
  }
  return { generatedAt, cards: outCards, entities: outEntities };
}

let cached: { at: number; payload: CatalogPayload } | null = null;

export async function loadCatalog(now: number = Date.now()): Promise<CatalogPayload> {
  if (cached && now - cached.at < CATALOG_TTL_MS) return cached.payload;
  const db = createServiceRoleClient();
  const [cards, entities, photos] = await Promise.all([
    fetchAllRows<CardRow>(() =>
      db.from('cards_catalog').select('card_no, num, entity_id, rarity, edition, photo_id').eq('in_packs', true).order('card_no', { ascending: true })),
    fetchAllRows<EntityRow>(() =>
      db.from('cards_entities').select('id, kind, name, group_id, debut_year, sort_key, lock_reasons').eq('active', true).order('id', { ascending: true })),
    fetchAllRows<PhotoRow>(() =>
      db.from('cards_photos')
        .select('id, slot, source, source_page, author, author_url, licence, licence_url, share_alike, modified, focal_x, focal_y, storage_path')
        .in('status', ['auto', 'approved']).order('id', { ascending: true })),
  ]);
  const payload = buildCatalog(cards, entities, photos, new Date(now).toISOString());
  cached = { at: now, payload };
  return payload;
}

export function resetCatalogCache(): void {
  cached = null;
}
