import { NextResponse } from 'next/server';

import { commonsFileFor } from '@/lib/entity-images/credit';
import { ImageError } from '@/lib/entity-images/errors';
import { fetchRemoteImage } from '@/lib/entity-images/fetch-remote';
import { adminGate, failure, forbidden, notFoundHandler, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { sniffImage } from '@/lib/entity-images/sniff';

import type { NextRequest } from 'next/server';

// Daily games step 2: POST /api/admin/photos/fetch, json { url }. "Ou colle l'adresse de l'image": the server downloads the picture with
// the guarded fetch of the anime admin (https only, public addresses only, checked again on each redirect, 10 s, 8 MB) and hands the bytes
// back to the admin's browser, which makes the WebP sizes with its canvas (a picture of another site cannot be drawn there directly).
// CR-021 (owner decision of 2026-11-02): a Wikimedia Commons address (the file page, or upload.wikimedia.org) is looked up on Commons first (5 s, a
// User-Agent that names the project) and refused when the file is not free (422 not_free); the download is then the picture itself. With
// `info: true` in the body nothing is downloaded and the answer is JSON, { ok, commons } with the licence and the author Commons gives (to pre-fill
// the form), or { ok, commons: null } for an address that is not a Commons one. Nothing is stored here (the save route asks Commons again).
// Admin only on the anime build (404 otherwise); same-origin only.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    if (typeof body.url !== 'string' || !body.url.trim()) throw new ImageError('bad_url', 400, 'Colle l\'adresse d\'une image.');
    // Commons first: its file page is not an image, and a file that is not free is never downloaded.
    const commons = await commonsFileFor(body.url);
    if (body.info === true) {
      return NextResponse.json({
        ok: true,
        commons: commons && {
          file: commons.title, pageUrl: commons.pageUrl, license: commons.license, licenseLabel: commons.licenseLabel, licenseUrl: commons.licenseUrl,
          author: commons.author, note: commons.note,
        },
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    const bytes = await fetchRemoteImage(commons ? commons.imageUrl : body.url);
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
