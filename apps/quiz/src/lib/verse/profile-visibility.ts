// V-PROFILE-ONE step 3/3b - per-section profile visibility. The profile is PRIVATE
// by default: a section is public ONLY after an explicit opt-in. Storage:
//   - the card SHOWCASE keeps its shipped opt-in (verse_profile_shelf_settings.is_public)
//   - every other section lives in profile_section_visibility (migration 143)
// One helper abstracts both, so callers never care which store backs a section.
// General on purpose: `section` is an open string, so V-COMM-3 can add sections.

import { createServiceRoleClient } from '@/lib/supabase/server';

// The sections the profile fan-resume governs. `cards` reads the shelf flag; the
// rest read profile_section_visibility. Adding a section here does not need a
// migration (the table is section-agnostic).
export const PROFILE_SECTIONS = ['roles', 'contrib_xp', 'pages', 'essays', 'cards', 'quiz', 'activity'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export type Visibility = Record<ProfileSection, boolean>;

const allPrivate = (): Visibility => Object.fromEntries(PROFILE_SECTIONS.map((s) => [s, false])) as Visibility;

/** Every section's public/private state for a user (default all private). */
export async function getProfileVisibility(userId: string): Promise<Visibility> {
  const svc = createServiceRoleClient();
  const [rows, shelf] = await Promise.all([
    svc.from('profile_section_visibility').select('section, is_public').eq('user_id', userId),
    svc.from('verse_profile_shelf_settings').select('is_public').eq('user_id', userId).maybeSingle(),
  ]);
  const vis = allPrivate();
  for (const r of (rows.data ?? []) as Array<{ section: string; is_public: boolean }>) {
    if ((PROFILE_SECTIONS as readonly string[]).includes(r.section)) vis[r.section as ProfileSection] = r.is_public;
  }
  // The showcase is governed by the shipped shelf flag, the single source of truth.
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
