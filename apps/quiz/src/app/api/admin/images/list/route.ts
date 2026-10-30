import { adminGate, failure, notFoundHandler, ok } from '@/lib/entity-images/route-kit';
import { adminNotFound } from '@/lib/admin/guard';
import { IMAGE_SITE } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { listImages } from '@/lib/entity-images/list';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Run O1 (ADM back): GET /api/admin/images/list?site=anime. The series of the anime site with their characters, the state of each
// image and the counts. Admin only (404 otherwise), anime build only.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  try {
    const site = new URL(req.url).searchParams.get('site') ?? IMAGE_SITE;
    if (site !== IMAGE_SITE) throw new ImageError('bad_request', 400, 'Only site=anime has images.');
    return ok(await listImages(createServiceRoleClient()));
  } catch (e) {
    return failure(e);
  }
}

// Every other method answers 404, not Next's 405.
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
export const OPTIONS = notFoundHandler;

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const HEAD = adminNotFound;
