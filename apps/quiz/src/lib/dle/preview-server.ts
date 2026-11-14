// Lot 3 DLE: the server half of the owner's private preview (see preview.ts). Used by the two routes of app/api/admin/dle-preview only.
import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { adminNotFound } from '@/lib/admin/guard';
import { BUCKET } from '@/lib/entity-images/constants';
import { selectNonFreeRow, selectNonFreeRows } from '@/lib/entity-images/non-free';
import { reviewItemOf, selectSeriesRow, selectSeriesRows } from '@/lib/entity-images/series-review';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { PREVIEW_HEADERS, isPreviewId, isSeriesSlug } from './preview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

/** The one refusal: the admin 404, byte for byte the guard's own (lib/admin/guard.ts adminNotFound: no-store, noindex). A route answers it before the guard when the preview is not configured. */
const closed = (): NextResponse => adminNotFound();

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { ...PREVIEW_HEADERS } });
}

const PAGE = 1000;

/** "<series slug>/<character slug>" to the character's id (the entity id of the games), for the anime site: two paged reads, past the 1000-row cap. */
async function characterIds(db: Db): Promise<Map<string, string>> {
  const series = new Map<number, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('groups').select('id, slug').eq('site_id', 'anime').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error('groups');
    for (const g of (data ?? []) as { id: number; slug: string }[]) series.set(g.id, g.slug);
    if ((data ?? []).length < PAGE) break;
  }
  const out = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('characters').select('id, group_id, slug').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error('characters');
    for (const c of (data ?? []) as { id: number; group_id: number; slug: string }[]) {
      const s = series.get(c.group_id);
      if (s) out.set(`${s}/${c.slug}`, String(c.id));
    }
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

/** The slug "<series>/<character>" of a character id of the anime site, or null. */
async function slugOf(db: Db, id: string): Promise<string | null> {
  const c = await db.from('characters').select('slug, group_id').eq('id', Number(id)).maybeSingle();
  if (c.error || !c.data) return null;
  const g = await db.from('groups').select('slug').eq('id', c.data.group_id).eq('site_id', 'anime').maybeSingle();
  if (g.error || !g.data) return null;
  return `${g.data.slug}/${c.data.slug}`;
}

/** { ok, ids }: the entity ids (character ids) that have a picture to preview. Ids only, never a slug, a path or an address. */
export async function previewIndex(db: Db = createServiceRoleClient()): Promise<NextResponse> {
  try {
    const byId = await characterIds(db);
    const ids = (await selectNonFreeRows(db)).flatMap((r) => { const id = byId.get(r.slug); return id ? [id] : []; });
    return json({ ok: true, ids });
  } catch {
    return json({ ok: false }, 500);
  }
}

/** The bytes of one selected picture, nothing else: an id that is not selected, or not shaped like one, is the plain 404. */
export async function previewImage(id: string | null, size: string | null, db: Db = createServiceRoleClient()): Promise<NextResponse> {
  if (!isPreviewId(id)) return closed();
  try {
    const slug = await slugOf(db, id);
    const row = slug ? await selectNonFreeRow(db, slug) : null;
    if (!row) return closed();
    const { data, error } = await db.storage.from(BUCKET).download(row.path);
    if (error || !data) return closed();
    let bytes: Uint8Array = new Uint8Array(await (data as Blob).arrayBuffer());
    if (size !== 'full') bytes = await sharp(bytes).resize({ width: 96, height: 128, fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer();
    return new NextResponse(bytes as BodyInit, { status: 200, headers: { ...PREVIEW_HEADERS, 'Content-Type': 'image/webp', 'Content-Disposition': 'inline', 'Content-Length': String(bytes.length) } });
  } catch {
    return closed();
  }
}

/**
 * The series rows that remain after the non-free deletion, for the owner to check (2026-11-14): { ok, series: [{ slug, license, verified, source, host }] }.
 * Read only. No path and no address leave the server, only the host; the pictures come through previewSeriesImage.
 */
export async function previewSeriesIndex(db: Db = createServiceRoleClient()): Promise<NextResponse> {
  try {
    return json({ ok: true, series: (await selectSeriesRows(db)).map(reviewItemOf) });
  } catch {
    return json({ ok: false }, 500);
  }
}

/** The bytes of one series picture (a 160 px wide tile), whatever its licence or state: the owner looks at every one. A slug that is not a series is the plain 404. */
export async function previewSeriesImage(slug: string | null, db: Db = createServiceRoleClient()): Promise<NextResponse> {
  if (!isSeriesSlug(slug)) return closed();
  try {
    const row = await selectSeriesRow(db, slug);
    if (!row) return closed();
    const { data, error } = await db.storage.from(BUCKET).download(row.path);
    if (error || !data) return closed();
    const bytes = await sharp(new Uint8Array(await (data as Blob).arrayBuffer())).resize({ width: 160, height: 213, fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer();
    return new NextResponse(bytes as BodyInit, { status: 200, headers: { ...PREVIEW_HEADERS, 'Content-Type': 'image/webp', 'Content-Disposition': 'inline', 'Content-Length': String(bytes.length) } });
  } catch {
    return closed();
  }
}
