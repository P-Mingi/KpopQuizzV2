import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { pictureTags, revalidateImage } from '@/lib/entity-images/cache';
import { IMAGE_SITE } from '@/lib/entity-images/constants';
import { adminGate, failure, forbidden, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { deleteImage } from '@/lib/entity-images/store';
import { parseKind, parseSlug } from '@/lib/entity-images/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE { kind, slug } (json body, or ?kind=&slug= in the query): removes the uploaded image and its files, so the page shows the
 * bundled photo or the placeholder again. Admin only (404 otherwise), on the anime build and on the hub. Served at /api/admin/images and at
 * /api/admin/images/delete. ADMIN-2: the site is the admin's choice (site in the query or the body; only anime has images); the write is
 * journaled under it and the cache of that site is refreshed.
 */
export async function deleteHandler(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const q = new URL(req.url).searchParams;
    const body = req.headers.get('content-length') === '0' || !req.body ? {} : await readJson(req);
    const siteResult = adminSiteOf(req, body, { only: [IMAGE_SITE] });
    if (!siteResult.ok) return siteResult.res;
    const site = siteResult.site;
    const kind = parseKind(body.kind ?? q.get('kind'));
    const slug = parseSlug(kind, body.slug ?? q.get('slug'));
    const image = await deleteImage(createServiceRoleClient(), kind, slug, revalidateImage);
    const cache = await revalidateSite(site, pictureTags(site));
    await logAdminAction({ user: { id: gate.userId } }, { site, action: 'image.delete', targetType: kind, targetId: slug, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
    return ok({ image });
  } catch (e) {
    return failure(e);
  }
}
