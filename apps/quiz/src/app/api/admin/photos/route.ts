import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { revalidateImage } from '@/lib/entity-images/cache';
import { MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { resolveCredit } from '@/lib/entity-images/credit';
import { adminGate, failure, forbidden, notFoundHandler, ok, readForm, sameOrigin } from '@/lib/entity-images/route-kit';
import { assertPhotoEntity, removePhoto, savePhoto } from '@/lib/photos/store';
import { parseFlag, parseFocalFields, parsePhotoTarget } from '@/lib/photos/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Daily games step 2: POST /api/admin/photos, multipart: kind (idol, group, agency, series, character), slug, meta (JSON: source_url, author,
// license, license_note), link (the address the picture was pasted from, if any), verified ('1' or '0'), focal_x, focal_y, and optionally the three WebP files the admin's browser made (x1, x2,
// thumb: the 1x box of the kind, twice that, the 96 px square). Without files, the stored picture keeps its files and gets the new credit,
// box and focal point. A series or a character is saved only with its licence verified: OtakuQuiz shows its rows as soon as they exist.
// CR-021 (owner decision of 2026-11-02): the licence is one of CC0, public domain, CC BY, CC BY-SA, other free licence (the author is required for
// CC BY and CC BY-SA, the source page is optional). When the link or the source page is a Wikimedia Commons file, Commons is asked here, server
// side, and its licence and author win over what was typed; a file that is not free is refused and nothing is stored.
// action 'remove' (with kind and slug only): removes the picture, its row and its three files ("Retirer la photo"; a series or a character
// goes back to its bundled photo or the placeholder). No action, or 'save': the save above.
// Admin only on the anime build, the gate of the anime admin (404 otherwise); same-origin writes only.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FORM = 3 * MAX_OUTPUT_BYTES + 64 * 1024;

async function fileBytes(form: FormData, name: string): Promise<Uint8Array | null> {
  const f = form.get(name);
  if (!f || typeof f === 'string') return null;
  return new Uint8Array(await f.arrayBuffer());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const form = await readForm(req, MAX_FORM);
    const { kind, slug } = parsePhotoTarget(form.get('kind'), form.get('slug'));
    const action = form.get('action');
    if (action === 'remove') {
      const removed = await removePhoto(createServiceRoleClient(), kind, slug);
      if (kind === 'series' || kind === 'character') revalidateImage(kind, slug);
      await logAdminAction({ user: { id: gate.userId } }, { site: kind === 'series' || kind === 'character' ? 'anime' : 'kpop', action: 'photo.remove', targetType: kind, targetId: slug, requestId: requestIdOf(req) });
      return ok({ removed });
    }
    if (action !== null && action !== 'save') throw new ImageError('bad_request', 400, 'Action inconnue.');
    let rawMeta: unknown;
    try { rawMeta = JSON.parse(String(form.get('meta') ?? '')); } catch { throw new ImageError('bad_meta', 400, 'Choisis une licence : la source et l\'auteur sont à renseigner si besoin.'); }
    const link = form.get('link');
    const { credit: meta } = await resolveCredit(rawMeta, typeof link === 'string' ? link : null);
    const verified = parseFlag(form.get('verified'));
    if ((kind === 'series' || kind === 'character') && !verified) {
      throw new ImageError('bad_meta', 422, 'Pour une série ou un personnage, coche « licence vérifiée » : OtakuQuiz montre l\'image dès qu\'elle est enregistrée.');
    }
    const focal = parseFocalFields(form.get('focal_x'), form.get('focal_y'));
    const [x1, x2, thumb] = await Promise.all([fileBytes(form, 'x1'), fileBytes(form, 'x2'), fileBytes(form, 'thumb')]);
    const anyFile = Boolean(x1 || x2 || thumb);
    if (anyFile && !(x1 && x2 && thumb)) throw new ImageError('bad_request', 400, 'Les trois fichiers (1x, 2x et 96 px) vont ensemble.');
    const db = createServiceRoleClient();
    await assertPhotoEntity(db, kind, slug);
    const saved = await savePhoto(db, { kind, slug, files: anyFile ? { x1: x1!, x2: x2!, thumb: thumb! } : null, meta, verified, focal, userId: gate.userId });
    if (kind === 'series' || kind === 'character') revalidateImage(kind, slug);
    await logAdminAction({ user: { id: gate.userId } }, { site: kind === 'series' || kind === 'character' ? 'anime' : 'kpop', action: 'photo.save', targetType: kind, targetId: slug, detail: { verified, files: anyFile }, requestId: requestIdOf(req) });
    return ok({ photo: saved });
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
