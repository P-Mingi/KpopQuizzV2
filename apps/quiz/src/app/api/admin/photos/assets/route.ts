import { MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { adminGate, failure, forbidden, notFoundHandler, ok, readForm, sameOrigin } from '@/lib/entity-images/route-kit';
import { restoreAsset, retireAsset, saveAsset } from '@/lib/photos/store';
import { parseAssetMeta, parseAssetSettings, parseAssetSlot, parseFlag, parsePublish } from '@/lib/photos/validate';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Daily games step 2: POST /api/admin/photos/assets, multipart, field action:
// - save: key (an image slot, an icon or a sticker), settings (JSON, rebuilt from the lists), meta (JSON credit, for a picture), verified,
//   publish ('now', 'draft' or a date), no_file ('1' for an icon of the library), and the WebP files the admin's browser made (large,
//   mid for a banner or card image, thumb). Adds a version: the older ones stay as the history.
// - retire: key. Takes every version of the key off the site (a sticker removed).
// - restore: id. Puts an older version back (its published_at becomes now).
// Admin only on the anime build (404 otherwise); same-origin writes only. The pages of bunnyverse.org read site_assets_public with a one
// minute cache, so a change shows there within the minute, with no deploy.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FORM = 3 * MAX_OUTPUT_BYTES + 64 * 1024;

async function fileBytes(form: FormData, name: string): Promise<Uint8Array | null> {
  const f = form.get(name);
  if (!f || typeof f === 'string') return null;
  return new Uint8Array(await f.arrayBuffer());
}

function json(form: FormData, name: string): unknown {
  const raw = form.get(name);
  if (raw === null || raw === '') return null;
  try { return JSON.parse(String(raw)); } catch { throw new ImageError('bad_request', 400, `Le champ ${name} n'est pas lisible.`); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const form = await readForm(req, MAX_FORM);
    const action = form.get('action');
    const db = createServiceRoleClient();
    if (action === 'retire') {
      const slot = parseAssetSlot(form.get('key'));
      await retireAsset(db, slot.key);
      return ok({ retired: slot.key });
    }
    if (action === 'restore') {
      const id = Number(form.get('id'));
      if (!Number.isInteger(id) || id < 1) throw new ImageError('bad_request', 400, 'La version n\'est pas valide.');
      await restoreAsset(db, id);
      return ok({ restored: id });
    }
    if (action !== 'save') throw new ImageError('bad_request', 400, 'Action inconnue.');
    const slot = parseAssetSlot(form.get('key'));
    const settings = parseAssetSettings(slot, json(form, 'settings'));
    const noFile = slot.type === 'icon' && parseFlag(form.get('no_file'));
    const [large, mid, thumb] = await Promise.all([fileBytes(form, 'large'), fileBytes(form, 'mid'), fileBytes(form, 'thumb')]);
    if ((large || mid || thumb) && !(large && thumb)) throw new ImageError('bad_request', 400, 'Le grand fichier et la vignette vont ensemble.');
    const rawMeta = json(form, 'meta');
    const meta = noFile || rawMeta === null ? null : parseAssetMeta(rawMeta);
    const publishAt = parsePublish(form.get('publish'));
    const saved = await saveAsset(db, {
      slot, files: large && thumb ? { large, mid, thumb } : null, noFile, settings, meta, verified: parseFlag(form.get('verified')), publishAt, userId: gate.userId,
    });
    return ok({ saved: saved.id, key: slot.key });
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
