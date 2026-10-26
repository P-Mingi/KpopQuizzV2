import { revalidateImage } from '@/lib/entity-images/cache';
import { adminGate, failure, forbidden, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { deleteImage } from '@/lib/entity-images/store';
import { parseKind, parseSlug } from '@/lib/entity-images/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE { kind, slug } (json body, or ?kind=&slug= in the query): removes the uploaded image and its files, so the page shows the
 * bundled photo or the placeholder again. Admin only (404 otherwise). Served at /api/admin/images and at /api/admin/images/delete.
 */
export async function deleteHandler(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const q = new URL(req.url).searchParams;
    const body = req.headers.get('content-length') === '0' || !req.body ? {} : await readJson(req);
    const kind = parseKind(body.kind ?? q.get('kind'));
    const slug = parseSlug(kind, body.slug ?? q.get('slug'));
    return ok({ image: await deleteImage(createServiceRoleClient(), kind, slug, revalidateImage) });
  } catch (e) {
    return failure(e);
  }
}
