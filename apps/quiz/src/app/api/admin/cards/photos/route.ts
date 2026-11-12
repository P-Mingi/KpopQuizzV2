// Bunnyverse Cards (owner's mission of 2026-11-12): POST /api/admin/cards/photos, the photo review of the card game: list the pending photos,
// approve, reject or remove one, set its crop point, set a lock reason (including 'hiatus'), list and close reports. The actions are in
// lib/cards/admin-photos.ts; the guard is ADMIN-1's (requireAdmin('api') first, the admin 404 for anyone it refuses). The hub and anime builds
// (the photos admin is bunnyverse.org/anime's), 404 on kpopquiz.org.
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { handleAdminPhotos } from '@/lib/cards/admin-photos';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  return handleAdminPhotos(req);
}

// Every other method answers the admin 404, not Next's 405.
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
