import { NextResponse } from 'next/server';

import { ImageError } from '@/lib/entity-images/errors';
import { fetchRemoteImage } from '@/lib/entity-images/fetch-remote';
import { adminGate, failure, forbidden, notFoundHandler, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { sniffImage } from '@/lib/entity-images/sniff';

import type { NextRequest } from 'next/server';

// Daily games step 2: POST /api/admin/photos/fetch, json { url }. "Ou colle l'adresse de l'image": the server downloads the picture with
// the guarded fetch of the anime admin (https only, public addresses only, checked again on each redirect, 10 s, 8 MB) and hands the bytes
// back to the admin's browser, which makes the WebP sizes with its canvas (a picture of another site cannot be drawn there directly).
// Nothing is stored here. Admin only on the anime build (404 otherwise); same-origin only.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    if (typeof body.url !== 'string' || !body.url.trim()) throw new ImageError('bad_url', 400, 'Colle l\'adresse d\'une image.');
    const bytes = await fetchRemoteImage(body.url);
    const type = sniffImage(bytes);
    if (!type) throw new ImageError('unsupported_type', 415, 'Seules les images JPEG, PNG, WebP, GIF et AVIF sont acceptées.');
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'attachment' },
    });
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
