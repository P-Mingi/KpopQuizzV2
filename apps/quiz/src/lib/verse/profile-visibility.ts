// V-PROFILE-ONE step 3/3b/6 - per-section profile visibility (the SERVER reads/
// writes). The profile is PRIVATE by default: a section is public ONLY after an
// explicit opt-in. Storage:
//   - the card SHOWCASE keeps its shipped opt-in (verse_profile_shelf_settings.is_public)
//   - every other section lives in profile_section_visibility (migration 143)
// LEGACY sections default from their shipped (public) state for pre-launch
// profiles (see profile-sections.ts) so already-indexed profiles do not go dark.
// The pure section constants/types live in profile-sections.ts (client-safe).

import { createServiceRoleClient } from '@/lib/supabase/server';
import { PROFILE_SECTIONS, defaultsFor } from '@/lib/verse/profile-sections';

import type { ProfileSection, Visibility } from '@/lib/verse/profile-sections';

export * from '@/lib/verse/profile-sections';

/** Every section's public/private state for a user. `createdAt` selects the
 * cohort default for legacy sections; omit it (or pass null) to treat the profile
 * as new (all private), the safe default. */
export async function getProfileVisibility(userId: string, createdAt: string | null = null): Promise<Visibility> {
  const svc = createServiceRoleClient();
  const [rows, shelf] = await Promise.all([
    svc.from('profile_section_visibility').select('section, is_public').eq('user_id', userId),
    svc.from('verse_profile_shelf_settings').select('is_public').eq('user_id', userId).maybeSingle(),
  ]);
  // THROW on a read error: overlaying cohort defaults on a FAILED read would
  // silently discard explicit-private rows and republish them (fail-open leak).
  // The caller's safeFetch turns a throw into a fail-CLOSED redaction instead.
  if (rows.error) throw new Error(`getProfileVisibility: sections read failed: ${JSON.stringify(rows.error)}`);
  if (shelf.error) throw new Error(`getProfileVisibility: shelf read failed: ${JSON.stringify(shelf.error)}`);
  const vis = defaultsFor(createdAt);
  for (const r of (rows.data ?? []) as Array<{ section: string; is_public: boolean }>) {
    if ((PROFILE_SECTIONS as readonly string[]).includes(r.section)) vis[r.section as ProfileSection] = r.is_public; // explicit row wins
  }
  // The showcase is governed by the shipped shelf flag (default OFF), the single source of truth.
  vis.cards = !!(shelf.data as { is_public: boolean } | null)?.is_public;
  return vis;
}

/** Set one section public/private. `cards` writes the shelf flag; others the
 * visibility table. Owner-only: callers must have verified the user id. */
export async function setSectionVisibility(userId: string, section: ProfileSection, isPublic: boolean): Promise<void> {
  const svc = createServiceRoleClient();
  const now = new Date().toISOString();
  if (section === 'cards') {
    const { error } = await svc.from('verse_profile_shelf_settings').upsert({ user_id: userId, is_public: isPublic, updated_at: now }, { onConflict: 'user_id' });
    if (error) throw new Error(`setSectionVisibility(cards): ${JSON.stringify(error)}`);
    return;
  }
  const { error } = await svc.from('profile_section_visibility').upsert({ user_id: userId, section, is_public: isPublic, updated_at: now }, { onConflict: 'user_id,section' });
  if (error) throw new Error(`setSectionVisibility(${section}): ${JSON.stringify(error)}`);
}
