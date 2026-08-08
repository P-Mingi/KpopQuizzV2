// V-FOUNDATION F1 - slug generation for the page tree. Flat slugs (C2), unique per
// space. The pages.slug CHECK is ASCII-strict (^[a-z0-9]+(-[a-z0-9]+)*$), so this is
// stricter than the entity slugify (which keeps Hangul): any non [a-z0-9-] is dropped.
// Title-level disambiguation is the fandom convention ("Butter (album)" -> butter-album,
// chosen by the creator); this only guarantees uniqueness as a fallback (-2, -3, ...).

import type { SupabaseClient } from '@supabase/supabase-js';

export function pageSlug(title: string): string {
  const s = (title || '')
    .toLowerCase()
    .replace(/['".,()[\]]/g, '')
    .replace(/[^a-z0-9]+/g, '-')   // ASCII-only: Hangul + any non [a-z0-9] becomes a separator
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s || 'untitled';
}

/** True when `slug` satisfies the pages.slug CHECK (so a bad slug never reaches the DB). */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
}

/** A slug free within the space. Appends -2, -3, ... on collision (fallback uniqueness;
 * the creator normally disambiguates in the TITLE). Excludes `excludePageId` so a
 * rename that keeps the same slug does not collide with itself. */
export async function uniqueSlug(
  db: SupabaseClient, spaceId: number, base: string, excludePageId?: number,
): Promise<string> {
  const root = isValidSlug(base) ? base : pageSlug(base);
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    let q = db.from('pages').select('id').eq('space_id', spaceId).eq('slug', candidate).limit(1);
    if (excludePageId != null) q = q.neq('id', excludePageId);
    const { data } = await q;
    if (!data || data.length === 0) return candidate;
  }
  // Astronomically unlikely; keep it deterministic rather than throwing.
  return `${root}-${Date.now()}`;
}
