import { revalidateImage } from '@/lib/entity-images/cache';
import { MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { adminGate, failure, forbidden, notFoundHandler, ok, readForm, sameOrigin } from '@/lib/entity-images/route-kit';
import { CANDIDATE_ORIGINAL_MAX, SIGN_BATCH, readCreditFields } from '@/lib/photos/character-refs';
import { discardCandidate, publishCandidate, saveCandidate, signPreviews } from '@/lib/photos/character-refs-store';
import { parsePhotoTarget } from '@/lib/photos/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Owner, 2026-11-10 (lane charrefs, L32): POST /api/admin/photos/refs, multipart, the actions of the screen of the character references.
//   action 'sign'      slugs (JSON array of "<series>/<character>", 60 at most): short signed URLs of the private reference and candidate files.
//   action 'candidate' series, character, the credit (source_url, author, license, license_url) and, for a new picture, original (the file as
//                      chosen, hashed here and not stored) with x1, x2, thumb (the WebP files the browser made). Nothing is published.
//   action 'publish'   series, character, the credit: "Valider et publier" (refused on a Fandom address, the reference's picture or licence,
//                      a missing licence or candidate); sends the CANDIDATE through the pipeline of the Images tab and deletes the reference.
//   action 'discard'   series, character: removes the candidate.
// Admin only on the anime build (requireAdmin through adminGate, 404 otherwise); same-origin writes only; no public route reads the table or the bucket.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FORM = CANDIDATE_ORIGINAL_MAX + 3 * MAX_OUTPUT_BYTES + 64 * 1024;

async function fileBytes(form: FormData, name: string): Promise<Uint8Array | null> {
  const f = form.get(name);
  if (!f || typeof f === 'string') return null;
  return new Uint8Array(await f.arrayBuffer());
}

function target(form: FormData): { series: string; character: string } {
  const series = form.get('series');
  const character = form.get('character');
  const { slug } = parsePhotoTarget('character', `${typeof series === 'string' ? series : ''}/${typeof character === 'string' ? character : ''}`);
  const [s, c] = slug.split('/') as [string, string];
  return { series: s, character: c };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const form = await readForm(req, MAX_FORM);
    const action = form.get('action');
    const db = createServiceRoleClient();
    if (action === 'sign') {
      let list: unknown;
      try { list = JSON.parse(String(form.get('slugs') ?? '[]')); } catch { list = null; }
      if (!Array.isArray(list) || list.length > SIGN_BATCH || !list.every((v) => typeof v === 'string' && /^[a-z0-9-]{1,60}\/[a-z0-9-]{1,60}$/.test(v))) {
        throw new ImageError('bad_request', 400, 'La liste des personnages n\'est pas valide.');
      }
      return ok({ previews: await signPreviews(db, list as string[]) });
    }
    const { series, character } = target(form);
    if (action === 'discard') {
      await discardCandidate(db, series, character);
      return ok({ discarded: true });
    }
    const credit = readCreditFields((n) => form.get(n));
    if (action === 'candidate') {
      const [original, x1, x2, thumb] = await Promise.all([fileBytes(form, 'original'), fileBytes(form, 'x1'), fileBytes(form, 'x2'), fileBytes(form, 'thumb')]);
      const anyFile = Boolean(x1 || x2 || thumb || original);
      if (anyFile && !(x1 && x2 && thumb && original)) throw new ImageError('bad_request', 400, 'Le fichier d\'origine et les trois fichiers (1x, 2x et 96 px) vont ensemble.');
      const saved = await saveCandidate(db, { series, character, original, files: anyFile ? { x1: x1!, x2: x2!, thumb: thumb! } : null, credit });
      return ok({ candidate: saved });
    }
    if (action === 'publish') {
      const published = await publishCandidate(db, { series, character, credit, userId: gate.userId });
      revalidateImage('character', published.slug);
      return ok({ published });
    }
    throw new ImageError('bad_request', 400, 'Action inconnue.');
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
