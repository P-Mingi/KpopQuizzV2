import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { pictureTags, revalidateImage } from '@/lib/entity-images/cache';
import { IMAGE_SITE } from '@/lib/entity-images/constants';
import { adminGate, failure, forbidden, notFoundHandler, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { setFocal } from '@/lib/entity-images/store';
import { parseFocal, parseKind, parseSlug } from '@/lib/entity-images/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): PATCH /api/admin/images/focal, json: { kind, slug, x, y } with x and y from 0 to 100 (object-position, in percent).
// Admin only (404 otherwise), on the anime build and on the hub. ADMIN-2: the site is the admin's choice (site in the query or the body; only
// anime has images); the write is journaled under it and the cache of that site is refreshed.
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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
    const { x, y } = parseFocal(body.x, body.y);
    const image = await setFocal(createServiceRoleClient(), kind, slug, x, y, revalidateImage);
    const cache = await revalidateSite(site, pictureTags(site));
    await logAdminAction({ user: { id: gate.userId } }, { site, action: 'image.focal', targetType: kind, targetId: slug, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
    return ok({ image });
  } catch (e) {
    return failure(e);
  }
}

// Every other method answers 404, not Next's 405.
export const GET = notFoundHandler;
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const DELETE = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
