// Lot 3 DLE: the server half of the owner's private preview (see preview.ts). Used by the two routes of app/api/admin/dle-preview only.
import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { BUCKET } from '@/lib/entity-images/constants';
import { selectNonFreeRow, selectNonFreeRows } from '@/lib/entity-images/non-free';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { PREVIEW_HEADERS, isPreviewSlug, previewConfigured } from './preview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

/** 404 unless the hub build has PRIVATE_LAUNCH=1 AND the request is the verified admin (listed id, aal2). The same 404 for every refusal. */
export async function previewGate(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  if (!previewConfigured()) return { ok: false, res: closed() };
  const gate = await requireAdmin('api');
  return gate.ok ? { ok: true } : { ok: false, res: closed() };
}

function closed(): NextResponse {
  const res = adminNotFound();
  for (const [k, v] of Object.entries(PREVIEW_HEADERS)) res.headers.set(k, v);
  return res;
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { ...PREVIEW_HEADERS } });
}

/** { ok, ids }: the entity ids that have a picture to preview. Ids only, never a path or an address. */
export async function previewIndex(db: Db = createServiceRoleClient()): Promise<NextResponse> {
  try {
    return json({ ok: true, ids: (await selectNonFreeRows(db)).map((r) => r.slug) });
  } catch {
    return json({ ok: false }, 500);
  }
}

/** The bytes of one selected picture, nothing else: a slug that is not selected, or not shaped like one, is the plain 404. */
export async function previewImage(slug: string | null, size: string | null, db: Db = createServiceRoleClient()): Promise<NextResponse> {
  if (!isPreviewSlug(slug)) return closed();
  try {
    const row = await selectNonFreeRow(db, slug);
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
