// Lot 3 DLE (owner decision of 2026-11-13): the owner's PRIVATE preview of the Otakudle pictures that are not free. They show only in the
// owner's admin session, loaded in the browser after the page by the routes of app/api/admin/dle-preview, on the answer, the guesses and the
// search list of the three Otakudle; the owner looks, then deletes them with the button of the Photos tab. Pure rules here; no I/O.
//
// The rules, all of them closed by default:
//   1. hub build only (the Otakudle games live there);
//   2. hard cut: PRIVATE_LAUNCH must be exactly "1" (and the private launch gate must agree). Anything else, unset included: the routes
//      answer 404 and the client never asks;
//   3. the routes answer only requireAdmin (404 for a visitor and for any other account);
//   4. only the rows of the one selection of lib/entity-images/non-free.ts are served, only through these routes, never cached.
import { privateLaunchOn } from '@/lib/cards/private';
import { SITE_ID } from '@/lib/site/registry';

import type { PrivateLaunchEnv } from '@/lib/private-launch/config';
import type { SiteId } from '@/lib/site/types';

/** The two routes, before the build's base path. */
export const PREVIEW_INDEX_PATH = '/api/admin/dle-preview';
export const PREVIEW_IMAGE_PATH = '/api/admin/dle-preview/img';

/** True when this build may offer the preview at all: the hub, with PRIVATE_LAUNCH exactly 1 and the gate on. */
export function previewConfigured(site: SiteId = SITE_ID, env: PrivateLaunchEnv = process.env): boolean {
  return site === 'hub' && (env.PRIVATE_LAUNCH ?? '').trim() === '1' && privateLaunchOn(site, env);
}

/** The entity id of an Otakudle character is its row id in public.characters (the source views of 023 and 024 say c.id::text): digits, the only shape the image route accepts. */
const ID_RE = /^[1-9][0-9]{0,9}$/;
export const isPreviewId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);

/** The sizes of the image route: the 96 px-wide tile of the lists, and the stored 1x file for the answer card. */
export type PreviewSize = 'tile' | 'full';

export function previewImageUrl(base: string, id: string, size: PreviewSize): string {
  return `${base}${PREVIEW_IMAGE_PATH}?id=${encodeURIComponent(id)}&s=${size}`;
}

/** Every header of every answer of the preview routes: private, never stored by a browser cache, a CDN or a crawler. */
export const PREVIEW_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Vary: 'Cookie',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** What the browser holds once the index answered: which entities have a preview picture, and the addresses of its two sizes. */
export interface DlePreview {
  readonly has: (id: string) => boolean;
  readonly tile: (id: string) => string | null;
  readonly full: (id: string) => string | null;
}

/** The preview of an index answer, or null when it holds nothing (the page then draws exactly what everyone sees). Ids not shaped like a character id are dropped. */
export function makePreview(ids: unknown, base = ''): DlePreview | null {
  if (!Array.isArray(ids)) return null;
  const set = new Set(ids.filter(isPreviewId));
  if (set.size === 0) return null;
  return {
    has: (id) => set.has(id),
    tile: (id) => (set.has(id) ? previewImageUrl(base, id, 'tile') : null),
    full: (id) => (set.has(id) ? previewImageUrl(base, id, 'full') : null),
  };
}
