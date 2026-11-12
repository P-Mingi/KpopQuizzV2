// Bunnyverse Cards: the owner's photo review, POST /api/admin/cards/photos (ADMIN-1: the route calls requireAdmin('api') first and
// only then this module). JSON { action, ... }:
//   list         { status?, limit?, after? }   photos by id (default status pending), with the idol, group and the cards they feed
//   approve      { id, note? }                 status approved (a second live photo in the same slot is refused: 409 slot_taken)
//   reject       { id, note? }                 status rejected; its cards leave the packs (trigger cards_photo_retire)
//   remove       { id, note? }                 status removed (the 48 hour answer to a report); same retirement
//   focal        { id, x, y }                  the crop point, 0 to 100
//   lock         { entity, rarity, reason }    why a missing edition is missing; reason null clears it. 'hiatus' is set here only (decision 4)
//   reports      { status?, limit?, after? }   the reports of "Report a photo"
//   close_report { id }                        closes a report (the trigger erases its contact)
// Hub build only (404 elsewhere), same-origin writes only. Reads and writes go through the service role.
import { adminNotFound } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SITE_ID } from '@/lib/site/registry';

import { NO_STORE, readJson, ownSite } from './api';
import { LOCK_SENTENCES, RARITIES } from './rules';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const reply = (body: unknown, status = 200): NextResponse => NextResponse.json(body, { status, headers: NO_STORE });
const fail = (error: string, status: number): NextResponse => reply({ error }, status);

const PHOTO_STATUSES = ['auto', 'pending', 'approved', 'rejected', 'removed'] as const;
const REPORT_STATUSES = ['open', 'closed'] as const;
const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 2_000_000_000 ? v : null);
const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100 ? v : null);
const note = (v: unknown): string | null | undefined => (v === undefined || v === null ? null : typeof v === 'string' && v.length <= 500 ? v.trim() || null : undefined);

type Db = ReturnType<typeof createServiceRoleClient>;

async function setStatus(db: Db, id: number, status: 'approved' | 'rejected' | 'removed', review: string | null): Promise<NextResponse> {
  const patch: Record<string, unknown> = { status };
  if (review !== null) patch.review_note = review;
  const { data, error } = await db.from('cards_photos').update(patch).eq('id', id).select('id, status').maybeSingle();
  if (error) return error.code === '23505' ? fail('slot_taken', 409) : fail('server', 500);
  if (!data) return fail('not_found', 404);
  return reply({ ok: true, photo: data });
}

export async function handleAdminPhotos(req: NextRequest): Promise<NextResponse> {
  if (SITE_ID !== 'hub') return adminNotFound();
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
    const { data, error } = list
      ? await db.from('cards_photos')
          .select('id, entity_id, slot, source, source_page, file_url, author, author_url, licence, licence_url, share_alike, checked_at, event_name, event_date, focal_x, focal_y, storage_path, status, review_note, modified, cards_entities(name, group_id)')
          .eq('status', status).gt('id', after).order('id', { ascending: true }).limit(limit)
      : await db.from('cards_reports')
          .select('id, photo_id, card_no, role, message, contact, created_at, status')
          .eq('status', status).gt('id', after).order('id', { ascending: true }).limit(limit);
    if (error) return fail('server', 500);
    const rows = (data ?? []) as { id: number }[];
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

  if (action === 'lock') {
    const entity = body.entity;
    const rarity = body.rarity;
    const reason = body.reason;
    if (typeof entity !== 'string' || !/^idol:[\w.-]{1,64}$/.test(entity)) return fail('bad_request', 400);
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

  if (action === 'close_report') {
    const id = posInt(body.id);
    if (id === null) return fail('bad_request', 400);
    const { data, error } = await db.from('cards_reports').update({ status: 'closed' }).eq('id', id).select('id, status').maybeSingle();
    if (error) return fail('server', 500);
    return data ? reply({ ok: true, report: data }) : fail('not_found', 404);
  }

  return fail('bad_request', 400);
}

