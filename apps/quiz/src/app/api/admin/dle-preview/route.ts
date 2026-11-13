import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { previewConfigured } from '@/lib/dle/preview';
import { previewIndex } from '@/lib/dle/preview-server';
import { notFoundHandler } from '@/lib/entity-images/route-kit';

import type { NextResponse } from 'next/server';

// Lot 3 DLE: GET /api/admin/dle-preview, the owner's private preview of the Otakudle pictures that are not free (lib/dle/preview.ts). Answers
// { ok, ids }: the entity ids that have a picture to preview. Hub build with PRIVATE_LAUNCH=1 and the verified admin only; 404 for anyone else,
// a visitor included. Never cached.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // The hard cut first (hub build, PRIVATE_LAUNCH exactly 1), then the admin guard: both answer the same admin 404.
  if (!previewConfigured()) return adminNotFound();
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  return previewIndex();
}

// Every other method answers 404, not Next's 405.
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
