// V-FOUNDATION F1 Phase C part 2 - THE UNIFICATION (C11). The space home becomes a
// PORTAL page inside the pages system: its published body (pages.blocks) holds the
// V-BUILDER composition the builder produces. This is the RE-POINTED write target -
// PUBLISH mirrors the presentation into the portal page, and the space home RENDERS
// from it. The builder + its widgets keep full value (the composition shape is
// unchanged); only the published store moves. STRANGLER: verse_spaces.presentation is
// still written on publish (rollback history + the chrome/meta source read by getSpace
// on every page), so a space without a portal page yet falls back with byte parity.

import type { SupabaseClient } from '@supabase/supabase-js';

import { presentationToComposition } from '@/lib/verse/composition/convert';
import { validatePresentation } from '@/lib/verse/presentation/validate';
import type { Composition } from '@/lib/verse/composition/types';
import type { Presentation } from '@/lib/verse/presentation/types';

// The space home reserves this slug for its portal page. The flat page route redirects
// /verse/<space>/home -> /verse/<space> (the canonical home), so it never double-serves.
export const PORTAL_SLUG = 'home';
const PORTAL_UUID = '00000000-0000-4000-8000-00000000110c';  // system author for auto-provisioned portals

/** The published portal page's stored presentation, or null if none yet (fallback). */
export async function getPortalPresentation(db: SupabaseClient, spaceId: number): Promise<Presentation | null> {
  const { data } = await db.from('pages')
    .select('blocks').eq('space_id', spaceId).eq('type', 'portal').eq('status', 'published').maybeSingle();
  const blocks = (data as { blocks?: unknown } | null)?.blocks;
  if (!blocks || typeof blocks !== 'object') return null;
  const res = validatePresentation(blocks);
  return res.ok && res.value ? res.value : null;
}

/** The composition the space home renders, sourced from the portal page (C11). Returns
 * null when the space has no portal page yet, so the caller falls back to the legacy
 * verse_spaces.presentation with byte parity. */
export async function getPortalComposition(db: SupabaseClient, spaceId: number): Promise<Composition | null> {
  const pres = await getPortalPresentation(db, spaceId);
  return pres ? presentationToComposition(pres) : null;
}

/** Mirror a published presentation into the space's portal page (the re-pointed write
 * target). Idempotent upsert on (space_id, slug); portal pages are never stubs and never
 * indexed as documents (the home is /verse/<space>, not a sub-URL). Called from PUBLISH. */
export async function upsertPortalPage(svc: SupabaseClient, spaceId: number, presentation: Presentation, author: string): Promise<void> {
  const { data: existing } = await svc.from('pages')
    .select('id').eq('space_id', spaceId).eq('slug', PORTAL_SLUG).maybeSingle();

  if (existing) {
    await svc.from('pages').update({
      blocks: presentation, type: 'portal', status: 'published', is_stub: false,
      updated_at: new Date().toISOString(),
    }).eq('id', (existing as { id: number }).id);
  } else {
    await svc.from('pages').insert({
      space_id: spaceId, parent_id: null, slug: PORTAL_SLUG, type: 'portal', title: 'Home',
      status: 'published', blocks: presentation, is_stub: false,
      created_by: author || PORTAL_UUID, published_at: new Date().toISOString(),
    });
  }
}
