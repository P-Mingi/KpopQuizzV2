// Bunnyverse Cards: the owner's photo review, POST /api/admin/cards/photos (ADMIN-1: the route calls requireAdmin('api') first and
// only then this module). JSON { action, ... }:
//   list         { status?, small2x?, limit?, after? }   photos by id (default status pending), with the subject; file_url is the public
//                                              address of the source photo (source_path in the images bucket) when there is one; small2x true lists only the
//                                              photos whose 5.5:8.5 crop is too small for 2x (small_2x). Lot 2: a GROUP photo gives a pair of cards (the
//                                              11:8.5 window at the one focal point, two halves), so its row carries halves: [{ part: 1, small_2x },
//                                              { part: 2, small_2x }], read from the cards_catalog rows of that photo (select *, so a database without
//                                              file 102 still answers) and falling back to the photo's own small_2x
//                                              Lot 7: every row also carries parts (2 or 3, null reads as 2), heads_box, parts_note, file_parts, file_pano
//                                              (null before file 118) and partsWarning: a plain line when the window of its cards at the CURRENT focal point
//                                              would cut someone (parts-rule.ts keepsEveryone), null when it keeps everyone or when no heads_box is known
//   parts        { photo, parts: 2 | 3 }       lot 7: the number of cards a group photo gives (cards_photos.parts, where id = photo); 409 with the
//                                              database's own message once a pack was opened and the photo is on a catalog card, or before file 118
//   approve      { id, note? }                 status approved (a second live photo in the same slot is refused: 409 slot_taken)
//   reject       { id, note? }                 status rejected; its cards leave the packs (trigger cards_photo_retire)
//   remove       { id, note? }                 status removed (the 48 hour answer to a report); same retirement
//   focal        { id, x, y }                  the crop point, 0 to 100. Writes focal_x and focal_y ONLY: the published files keep their own
//                                              file_focal_x/y, so the site shows the CSS crop until the owner's script recuts them
//   lock         { entity, rarity, reason }    why a missing edition of an idol or a group is missing; reason null clears it. 'hiatus' is
//                                              set here only (decision 4)
//   reports      { status?, limit?, after? }   the reports of "Report a photo" (default open), each with its card (number, name) and its
//                                              photo (source address, author, licence, status) when it names them
//   close_report { id }                        closes a report (the trigger erases its contact)
//   rebuild      {}                            lot 3: runs cards_build_catalog() (file 103), the edition rule, after the owner's review;
//                                              409 locked once a player owns a card or opened a pack, 409 not_ready before file 103
//   catalog_state {}                          { ok, frozen }: frozen once a player owns a card or opened a pack (the condition under which
//                                              cards_build_catalog() refuses), so the panel offers "Ajouter au catalogue" instead of "Reconstruire"
//   append_preview {}                         file 114: cards_catalog_append(true), what an append would add; writes nothing
//   append       { confirm: true }            file 114: cards_catalog_append(false), adds the new editions and subjects after the last number,
//                                              renumbers nothing; without confirm: true it is refused (400); 409 not_ready before file 114
// The hub build and the anime build (review 1 finding 6: the photos admin, and its Cartes tab, is the admin of bunnyverse.org/anime; both
// builds read the same database); 404 on kpopquiz.org. Same-origin writes only. Reads and writes go through the service role.
import { adminNotFound } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SITE_ID } from '@/lib/site/registry';

import { NO_STORE, readJson, ownSite } from './api';
import { publicObjectUrl } from './catalog';
import { keepsEveryone } from './parts-rule';
import { LOCK_SENTENCES, RARITIES } from './rules';

import type { HeadsBox } from './parts-rule';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const reply = (body: unknown, status = 200): NextResponse => NextResponse.json(body, { status, headers: NO_STORE });
const fail = (error: string, status: number): NextResponse => reply({ error }, status);
/** A refusal of the database with its own message, for the admin only (integrator, 2026-11-17: the panel showed a guess instead). */
const refused = (error: string, db: { message?: string } | null): NextResponse =>
  reply({ error, message: (db?.message ?? '').slice(0, 500) || null }, 409);

const PHOTO_STATUSES = ['auto', 'pending', 'approved', 'rejected', 'removed'] as const;
const REPORT_STATUSES = ['open', 'closed'] as const;
const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 2_000_000_000 ? v : null);
const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100 ? v : null);
const note = (v: unknown): string | null | undefined => (v === undefined || v === null ? null : typeof v === 'string' && v.length <= 500 ? v.trim() || null : undefined);

type Db = ReturnType<typeof createServiceRoleClient>;

interface ReportRow { id: number; photo_id: number | null; card_no: number | null }
interface ReportCard { card_no: number; num: string; entity_id: string; cards_entities: { name: string } | { name: string }[] | null }
interface ReportPhoto { id: number; entity_id: string; source_path: string | null; file_url: string; author: string; licence: string; status: string }

/** The photos of one status (the list action), only the small_2x ones on request. */
function photosOf(db: Db, status: string, small2x: boolean) {
  // '*': the lot 3 columns (quality, stage, sha1, event_date_precision, news_only) exist only once file 103 is applied.
  const q = db.from('cards_photos')
    .select('*, cards_entities(name, kind, group_id, lock_reasons)')
    .eq('status', status);
  return small2x ? q.eq('small_2x', true) : q;
}

interface CatalogHalf { photo_id: number | null; part?: number | null; small_2x?: boolean | null }
export interface HalfFlag { part: 1 | 2; small_2x: boolean }

/** A group photo (the entity is a group) gives a pair of cards. */
const isGroupRow = (r: PhotoListRow): boolean => {
  const e = Array.isArray(r.cards_entities) ? r.cards_entities[0] : r.cards_entities;
  return e?.kind === 'group' || (typeof r.entity_id === 'string' && r.entity_id.startsWith('group:'));
};
interface PhotoListRow { id: number; entity_id?: string; small_2x?: boolean | null; cards_entities?: { kind?: string } | { kind?: string }[] | null }

/**
 * The per half small_2x flags of the group photos of a list: each half's own flag from its cards_catalog row (part and small_2x, columns of file
 * 102), else the photo's small_2x. One read for the whole list, only when it holds a group photo. A failed read is not an error: the fallback answers.
 */
export function halvesOf(photo: PhotoListRow, catalog: readonly CatalogHalf[]): HalfFlag[] {
  const own = (part: 1 | 2): boolean => {
    const flags = catalog.filter((c) => c.photo_id === photo.id && c.part === part && typeof c.small_2x === 'boolean').map((c) => c.small_2x as boolean);
    return flags.length > 0 ? flags.some(Boolean) : photo.small_2x === true;
  };
  return [{ part: 1, small_2x: own(1) }, { part: 2, small_2x: own(2) }];
}

async function withHalves<T extends PhotoListRow>(db: Db, rows: T[]): Promise<Array<T | (T & { halves: HalfFlag[] })>> {
  const groups = rows.filter(isGroupRow);
  if (groups.length === 0) return rows;
  const res = await db.from('cards_catalog').select('*').in('photo_id', groups.map((r) => r.id));
  const catalog = res.error ? [] : ((res.data ?? []) as CatalogHalf[]);
  return rows.map((r) => (isGroupRow(r) ? { ...r, halves: halvesOf(r, catalog) } : r));
}

/** Lot 7: heads_box as the rule reads it, or null when the column is absent or holds anything else than five numbers. */
export function headsBoxOf(v: unknown): HeadsBox | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const n = (k: string): number | null => (typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : null);
  const x0 = n('x0'), x1 = n('x1'), y0 = n('y0'), y1 = n('y1'), hw = n('hw');
  return x0 === null || x1 === null || y0 === null || y1 === null || hw === null ? null : { x0, x1, y0, y1, hw };
}

/** The columns lot 7 adds to a photo row, as the admin's list answers them. */
export interface PartsFields { parts: 2 | 3 | null; heads_box: HeadsBox | null; parts_note: string | null; file_parts: 2 | 3 | null; file_pano: boolean; partsWarning: string | null }

/** Lot 7: the rule's warning for a photo as it is now: its cards (parts, 2 when null) at its current focal point. Null without a heads_box or the photo's size. */
export function partsWarningOf(r: { parts?: unknown; heads_box?: unknown; focal_x?: unknown; focal_y?: unknown; source_width?: unknown; source_height?: unknown }): string | null {
  const box = headsBoxOf(r.heads_box);
  const w = r.source_width, h = r.source_height, fx = r.focal_x, fy = r.focal_y;
  if (!box || typeof w !== 'number' || typeof h !== 'number' || w <= 0 || h <= 0 || typeof fx !== 'number' || typeof fy !== 'number') return null;
  const parts = r.parts === 3 ? 3 : 2;
  if (keepsEveryone(w, h, parts, fx, fy, box)) return null;
  return `The ${parts === 3 ? '16.5:8.5' : '11:8.5'} window of ${parts} cards would cut someone at the focal point ${fx}/${fy}. Move the focal point${parts === 2 ? ' or give this photo 3 cards' : ''}.`;
}

/** The lot 7 fields of one photo row (pure). Before file 118 the columns are absent: parts and file_parts read null, file_pano false, no warning. */
export function partsFieldsOf(r: Record<string, unknown>): PartsFields {
  const two3 = (v: unknown): 2 | 3 | null => (v === 2 || v === 3 ? v : null);
  return {
    parts: two3(r.parts), heads_box: headsBoxOf(r.heads_box), parts_note: typeof r.parts_note === 'string' ? r.parts_note : null,
    file_parts: two3(r.file_parts), file_pano: r.file_pano === true, partsWarning: partsWarningOf(r),
  };
}

/** The card and the photo a report names, for the reports inbox: two reads by key, whatever the number of reports. Null on a failed read. */
async function reportRefs<T extends ReportRow>(db: Db, rows: T[]): Promise<Array<T & { card: unknown; photo: unknown }> | null> {
  const cardNos = [...new Set(rows.flatMap((r) => (r.card_no === null ? [] : [r.card_no])))];
  const photoIds = [...new Set(rows.flatMap((r) => (r.photo_id === null ? [] : [r.photo_id])))];
  const [cards, photos] = await Promise.all([
    cardNos.length ? db.from('cards_catalog').select('card_no, num, entity_id, cards_entities(name)').in('card_no', cardNos) : { data: [], error: null },
    photoIds.length ? db.from('cards_photos').select('id, entity_id, source_path, file_url, author, licence, status').in('id', photoIds) : { data: [], error: null },
  ]);
  if (cards.error || photos.error) return null;
  const byNo = new Map(((cards.data ?? []) as ReportCard[]).map((c) => {
    const e = Array.isArray(c.cards_entities) ? c.cards_entities[0] : c.cards_entities;
    return [c.card_no, { n: c.card_no, num: c.num, entity: c.entity_id, name: e?.name ?? null }];
  }));
  const byId = new Map(((photos.data ?? []) as ReportPhoto[]).map((p) => [p.id, {
    id: p.id, entity: p.entity_id, url: p.source_path ? publicObjectUrl(p.source_path) : p.file_url, author: p.author, licence: p.licence, status: p.status,
  }]));
  return rows.map((r) => ({
    ...r,
    card: r.card_no === null ? null : (byNo.get(r.card_no) ?? null),
    photo: r.photo_id === null ? null : (byId.get(r.photo_id) ?? null),
  }));
}

/** Lot 3: a new photo has no bucket copy; the admin shows Commons' own 800 px copy of the file (the original can be 6,000 px). The owner's
 *  admin only: the game never loads a picture from another site. */
export function reviewCopyUrl(r: { source_page?: string | null; file_url?: string | null }): string | null {
  const m = r.source_page ? /^https:\/\/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)$/.exec(r.source_page) : null;
  if (!m) return r.file_url ?? null;
  let name = m[1]!.slice(5);
  try { name = decodeURIComponent(name); } catch { /* already plain */ }
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=800`;
}

async function setStatus(db: Db, id: number, status: 'approved' | 'rejected' | 'removed', review: string | null): Promise<NextResponse> {
  const patch: Record<string, unknown> = { status };
  if (review !== null) patch.review_note = review;
  const { data, error } = await db.from('cards_photos').update(patch).eq('id', id).select('id, status').maybeSingle();
  if (error) return error.code === '23505' ? fail('slot_taken', 409) : fail('server', 500);
  if (!data) return fail('not_found', 404);
  return reply({ ok: true, photo: data });
}

/** Lot 6: one locked pocket as the admin reads it. opens_month ('YYYY-MM') comes from cards_age_locks() and goes to the admin only (never to the public API). */
export interface AdminLockRow { entity: string; name: string; kind: string; group: string | null; opens_month: string | null }

/** The locked pockets with their opening month: from the rows of cards_age_locks() and the entities that carry the lock. null month: not known. */
export function lockRowsOf(
  locks: readonly { entity_id: string; locked: boolean | null; opens_month?: string | null }[],
  ents: readonly { id: string; name: string; kind: string; group_id: string | null }[],
  groupNames: ReadonlyMap<string, string>,
): AdminLockRow[] {
  const by = new Map(locks.map((l) => [l.entity_id, l]));
  return ents
    // an entity the database does not answer for counts as locked (fail closed), with no month
    .filter((e) => by.get(e.id)?.locked !== false)
    .map((e) => ({
      entity: e.id, name: e.name, kind: e.kind, group: e.kind === 'group' ? e.name : (e.group_id ? (groupNames.get(e.group_id) ?? null) : null),
      opens_month: typeof by.get(e.id)?.opens_month === 'string' ? (by.get(e.id)!.opens_month as string).slice(0, 7) : null,
    }))
    .sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.name.localeCompare(b.name));
}

export async function handleAdminPhotos(req: NextRequest): Promise<NextResponse> {
  if (SITE_ID !== 'hub' && SITE_ID !== 'anime') return adminNotFound();
  if (!ownSite(req)) return fail('origin', 403);
  const body = await readJson(req);
  const action = body?.action;
  if (!body || typeof action !== 'string') return fail('bad_request', 400);
  const db = createServiceRoleClient();

  if (action === 'list' || action === 'reports') {
    const list = action === 'list';
    const status = body.status === undefined ? (list ? 'pending' : 'open') : body.status;
    if (typeof status !== 'string' || !(list ? PHOTO_STATUSES : REPORT_STATUSES).includes(status as never)) return fail('bad_request', 400);
    const limit = body.limit === undefined ? 50 : posInt(body.limit);
    const after = body.after === undefined ? 0 : typeof body.after === 'number' && Number.isInteger(body.after) && body.after >= 0 ? body.after : null;
    if (limit === null || limit > 200 || after === null) return fail('bad_request', 400);
    const small = body.small2x;
    if (small !== undefined && typeof small !== 'boolean') return fail('bad_request', 400);
    const { data, error } = list
      ? await photosOf(db, status, small === true).gt('id', after).order('id', { ascending: true }).limit(limit)
      : await db.from('cards_reports')
          .select('id, photo_id, card_no, role, message, contact, created_at, status')
          .eq('status', status).gt('id', after).order('id', { ascending: true }).limit(limit);
    if (error) return fail('server', 500);
    let rows = (data ?? []) as { id: number; source_path?: string | null; file_url?: string | null }[];
    // The Cartes tab shows the source photo: file_url becomes the public address of the bucket copy (images/group-photos/<slug>.jpg).
    if (list) {
      rows = rows.map((r) => (r.source_path ? { ...r, file_url: publicObjectUrl(r.source_path) } : { ...r, file_url: reviewCopyUrl(r as { source_page?: string | null; file_url?: string | null }) }));
      rows = (await withHalves(db, rows as PhotoListRow[] as (PhotoListRow & { source_path?: string | null; file_url?: string | null })[])) as typeof rows;
      rows = rows.map((r) => ({ ...r, ...partsFieldsOf(r as unknown as Record<string, unknown>) }));
    }
    else {
      const withRefs = await reportRefs(db, rows as ReportRow[]);
      if (!withRefs) return fail('server', 500);
      rows = withRefs;
    }
    return reply({ ok: true, rows, next: rows.length === limit ? (rows[rows.length - 1]?.id ?? null) : null });
  }

  if (action === 'approve' || action === 'reject' || action === 'remove') {
    const id = posInt(body.id);
    const review = note(body.note);
    if (id === null || review === undefined) return fail('bad_request', 400);
    return setStatus(db, id, action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'removed', review);
  }

  if (action === 'focal') {
    const id = posInt(body.id);
    const x = pct(body.x);
    const y = pct(body.y);
    if (id === null || x === null || y === null) return fail('bad_request', 400);
    const { data, error } = await db.from('cards_photos').update({ focal_x: x, focal_y: y }).eq('id', id).select('id, focal_x, focal_y').maybeSingle();
    if (error) return fail('server', 500);
    return data ? reply({ ok: true, photo: data }) : fail('not_found', 404);
  }

  // Lot 7: the owner's choice of 2 or 3 cards for a group photo. The write has its WHERE on the id; the database refuses it (and says why) once a pack was
  // opened and the photo is on a catalog card; the same guard is checked here first so a database without that trigger still refuses.
  if (action === 'parts') {
    const id = posInt(body.photo);
    const parts = body.parts;
    if (id === null || (parts !== 2 && parts !== 3)) return fail('bad_request', 400);
    const [packs, onCard] = await Promise.all([db.from('cards_packs').select('id').limit(1), db.from('cards_catalog').select('card_no').eq('photo_id', id).limit(1)]);
    if (packs.error || onCard.error) return fail('server', 500);
    if ((packs.data ?? []).length > 0 && (onCard.data ?? []).length > 0) {
      return refused('locked', { message: 'cards: a pack was opened and this photo is on a catalog card, its number of cards can no longer change' });
    }
    const { data, error } = await db.from('cards_photos').update({ parts }).eq('id', id).select('id, parts').maybeSingle();
    if (error) return refused(/pack was opened|owns a card|opened/.test(error.message ?? '') ? 'locked' : 'not_ready', error);
    return data ? reply({ ok: true, photo: data }) : fail('not_found', 404);
  }

  if (action === 'lock') {
    const entity = body.entity;
    const rarity = body.rarity;
    const reason = body.reason;
    if (typeof entity !== 'string' || !/^(idol|group):[\w.-]{1,64}$/.test(entity)) return fail('bad_request', 400);
    if (typeof rarity !== 'string' || !(RARITIES as readonly string[]).includes(rarity)) return fail('bad_request', 400);
    if (reason !== null && (typeof reason !== 'string' || !(reason in LOCK_SENTENCES))) return fail('bad_request', 400);
    const { data, error } = await db.from('cards_entities').select('id, lock_reasons').eq('id', entity).maybeSingle();
    if (error) return fail('server', 500);
    if (!data) return fail('not_found', 404);
    const next = { ...((data as { lock_reasons: Record<string, string> | null }).lock_reasons ?? {}) };
    if (reason === null) delete next[rarity];
    else next[rarity] = reason;
    const upd = await db.from('cards_entities').update({ lock_reasons: next }).eq('id', entity);
    if (upd.error) return fail('server', 500);
    return reply({ ok: true, entity, lock_reasons: next });
  }

  // Lot 3: the edition rule of file 103 again (after the owner approved or refused photos of "A relire"). The database refuses it once a
  // player owns a card or opened a pack: the card numbers never change under a player.
  if (action === 'rebuild') {
    const { data, error } = await db.rpc('cards_build_catalog');
    if (error) return refused(/owns a card|pack was opened/.test(error.message ?? '') ? 'locked' : 'not_ready', error);
    return reply({ ok: true, summary: data });
  }

  // The catalog is frozen once a player holds a card or opened a pack: the numbers cannot change, only grow (file 114).
  if (action === 'catalog_state') {
    const [owned, packs] = await Promise.all([db.from('cards_owned').select('card_no').limit(1), db.from('cards_packs').select('id').limit(1)]);
    if (owned.error || packs.error) return fail('server', 500);
    return reply({ ok: true, frozen: (owned.data ?? []).length > 0 || (packs.data ?? []).length > 0 });
  }

  // File 114: the preview never writes; the write needs the explicit confirm: true of the second click.
  if (action === 'append_preview' || action === 'append') {
    if (action === 'append' && body.confirm !== true) return fail('bad_request', 400);
    const { data, error } = await db.rpc('cards_catalog_append', { p_dry_run: action !== 'append' });
    if (error) return refused('not_ready', error);
    return reply({ ok: true, summary: data });
  }

  // Lot 6: the age-locked pockets with the month each opens (the service role only: a browser never reads a month).
  if (action === 'age_locks') {
    const ents = await db.from('cards_entities').select('id, name, kind, group_id').eq('age_lock', true).limit(1000);
    if (ents.error) return fail('not_ready', 409);
    const list = (ents.data ?? []) as { id: string; name: string; kind: string; group_id: string | null }[];
    const locks = await db.rpc('cards_age_locks');
    if (locks.error || !Array.isArray(locks.data)) return fail('not_ready', 409);
    const gids = [...new Set(list.map((e) => e.group_id).filter((x): x is string => !!x))];
    const names = gids.length ? await db.from('cards_entities').select('id, name').in('id', gids) : { data: [], error: null };
    if (names.error) return fail('server', 500);
    const groupNames = new Map(((names.data ?? []) as { id: string; name: string }[]).map((g) => [g.id, g.name]));
    return reply({ ok: true, rows: lockRowsOf(locks.data as { entity_id: string; locked: boolean | null; opens_month?: string | null }[], list, groupNames) });
  }

  if (action === 'close_report') {
    const id = posInt(body.id);
    if (id === null) return fail('bad_request', 400);
    const { data, error } = await db.from('cards_reports').update({ status: 'closed' }).eq('id', id).select('id, status').maybeSingle();
    if (error) return fail('server', 500);
    return data ? reply({ ok: true, report: data }) : fail('not_found', 404);
  }

  return fail('bad_request', 400);
}

