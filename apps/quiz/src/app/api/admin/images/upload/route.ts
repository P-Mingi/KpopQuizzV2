import { MAX_SOURCE_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { revalidateImage } from '@/lib/entity-images/cache';
import { processImage } from '@/lib/entity-images/process';
import { adminGate, failure, forbidden, notFoundHandler, ok, readForm, sameOrigin } from '@/lib/entity-images/route-kit';
import { assertEntity, saveImage } from '@/lib/entity-images/store';
import { parseKind, parseMeta, parseSlug } from '@/lib/entity-images/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): POST /api/admin/images/upload, multipart: kind, slug, file, meta (JSON: source_url, author, license,
// license_note). Re-encodes to WebP (EXIF stripped) at the fixed sizes of the kind and stores both files. Admin only (404 otherwise).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const form = await readForm(req, MAX_SOURCE_BYTES + 256 * 1024);
    const kind = parseKind(form.get('kind'));
    const slug = parseSlug(kind, form.get('slug'));
    const file = form.get('file');
    if (!file || typeof file === 'string') throw new ImageError('bad_request', 400, 'Choose a picture to upload.');
    if (file.size > MAX_SOURCE_BYTES) throw new ImageError('too_large', 413, 'The file is larger than 8 MB.');
    const rawMeta = form.get('meta');
    let metaObject: unknown;
    if (typeof rawMeta === 'string') {
      try { metaObject = JSON.parse(rawMeta); } catch { throw new ImageError('bad_meta', 400, 'The source, author and licence could not be read.'); }
    } else {
      metaObject = { source_url: form.get('source_url'), author: form.get('author'), license: form.get('license'), license_note: form.get('license_note') };
    }
    const meta = parseMeta(metaObject);
    const db = createServiceRoleClient();
    await assertEntity(db, kind, slug);
    const image = await processImage(new Uint8Array(await file.arrayBuffer()), kind);
    return ok({ image: await saveImage(db, { kind, slug, image, meta, userId: gate.userId }, revalidateImage) });
  } catch (e) {
    return failure(e);
  }
}

// Every other method answers 404, not Next's 405.
export const GET = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
