import { revalidateImage } from '@/lib/entity-images/cache';
import { fetchRemoteImage } from '@/lib/entity-images/fetch-remote';
import { processImage } from '@/lib/entity-images/process';
import { adminGate, failure, forbidden, notFoundHandler, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { assertEntity, saveImage } from '@/lib/entity-images/store';
import { parseKind, parseMeta, parseSlug } from '@/lib/entity-images/validate';
import { ImageError } from '@/lib/entity-images/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): POST /api/admin/images/import, json: { kind, slug, url, meta }. Downloads the picture (https only, public
// addresses only, checked again on each redirect, 10 s, 8 MB), then stores a re-encoded copy. Nothing of the URL is kept for display.
// Admin only (404 otherwise).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    const kind = parseKind(body.kind);
    const slug = parseSlug(kind, body.slug);
    if (typeof body.url !== 'string' || !body.url.trim()) throw new ImageError('bad_url', 400, 'Paste the address of a picture.');
    const meta = parseMeta(body.meta);
    const db = createServiceRoleClient();
    await assertEntity(db, kind, slug);
    const bytes = await fetchRemoteImage(body.url);
    const image = await processImage(bytes, kind);
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
