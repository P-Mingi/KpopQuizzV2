// V-PROFILE-ONE - the profile visibility SECTIONS: pure constants + types with NO
// server dependency, so both server code (profile-visibility.ts) and client
// components (the owner controls) can import them without dragging next/headers
// into the client bundle.

// New (resume) sections default PRIVATE. Legacy sections default from the cohort.
export const RESUME_SECTIONS = ['roles', 'contrib_xp', 'pages', 'essays', 'cards', 'quiz', 'activity'] as const;
export const LEGACY_SECTIONS = ['spaces', 'contributions', 'collection', 'essays_list'] as const;
export const PROFILE_SECTIONS = [...RESUME_SECTIONS, ...LEGACY_SECTIONS] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];
export type Visibility = Record<ProfileSection, boolean>;

const LEGACY = new Set<string>(LEGACY_SECTIONS);
// The instant the per-section model shipped. Profiles created before this keep
// their legacy sections public (their shipped state); newer profiles do not.
export const PROFILE_MODEL_LAUNCH = '2026-08-02T00:00:00.000Z';

/** The default (no explicit row) state of a section for a profile of this age. */
export function defaultFor(section: ProfileSection, createdAt: string | null): boolean {
  if (!LEGACY.has(section)) return false; // resume sections: private by default
  return !!createdAt && createdAt < PROFILE_MODEL_LAUNCH; // legacy: public for pre-launch profiles only
}

export const defaultsFor = (createdAt: string | null): Visibility =>
  Object.fromEntries(PROFILE_SECTIONS.map((s) => [s, defaultFor(s, createdAt)])) as Visibility;
