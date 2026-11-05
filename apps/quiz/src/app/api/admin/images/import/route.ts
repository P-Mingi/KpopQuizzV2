import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { pictureTags, revalidateImage } from '@/lib/entity-images/cache';
import { IMAGE_SITE } from '@/lib/entity-images/constants';
import { fetchRemoteImage } from '@/lib/entity-images/fetch-remote';
import { processImage } from '@/lib/entity-images/process';
import { adminGate, failure, forbidden, notFoundHandler, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { linkIsCommons, resolveCredit } from '@/lib/entity-images/credit';
import { assertEntity, saveImage } from '@/lib/entity-images/store';
import { parseKind, parseMeta, parseSlug } from '@/lib/entity-images/validate';
import { ImageError } from '@/lib/entity-images/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): POST /api/admin/images/import, json: { kind, slug, url, meta }. Downloads the picture (https only, public
// addresses only, checked again on each redirect, 10 s, 8 MB), then stores a re-encoded copy. Nothing of the URL is kept for display.
// Admin only (404 otherwise), on the anime build and on the hub. ADMIN-2: the site is the admin's choice (site in the query or the body; only
// anime has images); the write is journaled under it and the cache of that site is refreshed.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    const siteResult = adminSiteOf(req, body, { only: [IMAGE_SITE] });
    if (!siteResult.ok) return siteResult.res;
    const site = siteResult.site;
    const kind = parseKind(body.kind);
    const slug = parseSlug(kind, body.slug);
    if (typeof body.url !== 'string' || !body.url.trim()) throw new ImageError('bad_url', 400, 'Paste the address of a picture.');
    // The rules of this tab first, then CR-021: a Commons link (the address pasted or the source page) is read on Commons before any download.
    parseMeta(body.meta);
    const { credit: meta, file } = await resolveCredit(body.meta, body.url);
    const db = createServiceRoleClient();
    await assertEntity(db, kind, slug);
    const bytes = await fetchRemoteImage(file && linkIsCommons(body.url) ? file.imageUrl : body.url);
    const image = await processImage(bytes, kind);
    const saved = await saveImage(db, { kind, slug, image, meta, userId: gate.userId }, revalidateImage);
    const cache = await revalidateSite(site, pictureTags(site));
    await logAdminAction({ user: { id: gate.userId } }, { site, action: 'image.import', targetType: kind, targetId: slug, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
    return ok({ image: saved });
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
