import { revalidateImage } from '@/lib/entity-images/cache';
import { adminGate, failure, forbidden, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { setFocal } from '@/lib/entity-images/store';
import { parseFocal, parseKind, parseSlug } from '@/lib/entity-images/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): PATCH /api/admin/images/focal, json: { kind, slug, x, y } with x and y from 0 to 100 (object-position, in percent).
// Admin only (404 otherwise).
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    const kind = parseKind(body.kind);
    const slug = parseSlug(kind, body.slug);
    const { x, y } = parseFocal(body.x, body.y);
    return ok({ image: await setFocal(createServiceRoleClient(), kind, slug, x, y, revalidateImage) });
  } catch (e) {
    return failure(e);
  }
}
