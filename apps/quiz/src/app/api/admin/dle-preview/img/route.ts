import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { previewConfigured } from '@/lib/dle/preview';
import { previewImage } from '@/lib/dle/preview-server';
import { notFoundHandler } from '@/lib/entity-images/route-kit';

import type { NextRequest, NextResponse } from 'next/server';

// Lot 3 DLE: GET /api/admin/dle-preview/img?id=<character id>&s=tile|full, the bytes of one picture of the owner's private preview
// (lib/dle/preview.ts). The only way those files reach a browser: no public address is ever sent to the page, nothing goes through the image
// optimiser, and every header says private and no-store. 404 for anyone but the verified admin, and for a picture that is not selected.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // The hard cut first (hub build, PRIVATE_LAUNCH exactly 1), then the admin guard: both answer the same admin 404.
  if (!previewConfigured()) return adminNotFound();
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const q = req.nextUrl.searchParams;
  return previewImage(q.get('id'), q.get('s'));
}

// Every other method answers 404, not Next's 405.
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
