import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { ASSET_TAGS } from '@/lib/entity-images/cache';
import { MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { adminGate, failure, forbidden, notFoundHandler, ok, ownSite, readForm, sameOrigin } from '@/lib/entity-images/route-kit';
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
// Admin only on the anime build and on the hub (404 otherwise); same-origin writes only. The pages of bunnyverse.org read site_assets_public with
// a one minute cache, so a change shows there within the minute, with no deploy.
// ADMIN-2: the assets are bunnyverse.org's (the hub's: there is no site column), so the site is hub (site in the query or the form; another site
// is a 400). The hub build requires it; the anime build, until step 6, means hub when none is sent. The write is journaled under hub and the
// tag of the live assets is expired on the hub's deployment at once (the minute of the cache is only the fallback).
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
    const siteResult = adminSiteOf(req, { site: form.get('site') }, ownSite('hub'));
    if (!siteResult.ok) return siteResult.res;
    const site = siteResult.site;
    const action = form.get('action');
    const db = createServiceRoleClient();
    if (action === 'retire') {
      const slot = parseAssetSlot(form.get('key'));
      await retireAsset(db, slot.key);
      const cache = await revalidateSite(site, ASSET_TAGS);
      await logAdminAction({ user: { id: gate.userId } }, { site, action: 'asset.retire', targetType: 'site_asset', targetId: slot.key, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
      return ok({ retired: slot.key });
    }
    if (action === 'restore') {
      const id = Number(form.get('id'));
      if (!Number.isInteger(id) || id < 1) throw new ImageError('bad_request', 400, 'La version n\'est pas valide.');
      await restoreAsset(db, id);
      const cache = await revalidateSite(site, ASSET_TAGS);
      await logAdminAction({ user: { id: gate.userId } }, { site, action: 'asset.restore', targetType: 'site_asset', targetId: id, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
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
    const cache = await revalidateSite(site, ASSET_TAGS);
    await logAdminAction({ user: { id: gate.userId } }, { site, action: 'asset.save', targetType: 'site_asset', targetId: slot.key, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(req) });
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
