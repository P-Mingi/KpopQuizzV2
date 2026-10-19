// Run O1, lot (c) part 2, lane B3: a profile as a given site shows it (contract rpcs.md 3, PassportServerFns
// ['profileForSite'], types.ts PROFILE_FROM_MEMBERSHIP; F0 decision 64). Pure.
//
// kpop keeps profiles.* as its only truth, so on 'kpop' the very same object comes back. On another site the
// shared kpop components render a profiles-shaped object whose fields come from the member's membership row of
// that site: every key of PROFILE_FROM_MEMBERSHIP takes the membership value, a null value becomes the field's
// neutral value (0 for a count, '' for bio, null otherwise) and never falls back to the kpop value (no K-pop text on
// anime), except display_name, which falls back to profiles.display_name. The keys of avatar_override replace the
// profiles columns of the same name. ult_groups is []. A missing membership gives the neutral values everywhere.

import { PROFILE_FROM_MEMBERSHIP } from '@/lib/passport/types';

import type { SiteId } from '@/lib/site/types';
import type { MemberPublic, MembershipAvatarOverride, ProfileForSiteInput } from '@/lib/passport/types';

/** The profiles fields whose neutral value is a count (0). */
const COUNT_FIELDS: ReadonlySet<string> = new Set([
  'xp', 'total_quizzes_created', 'total_plays_received', 'total_likes_received', 'follower_count', 'following_count',
]);

function neutral(field: string): number | string | null {
  if (COUNT_FIELDS.has(field)) return 0;
  return field === 'bio' ? '' : null;
}

function overrideOf(value: unknown): MembershipAvatarOverride {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as MembershipAvatarOverride) : {};
}

/**
 * The contract order is (site, profile, membership) (rpcs.md 3, PassportServerFns). The order the lot (c) brief
 * writes, (profile, membership, site), is accepted too: the first argument tells them apart (a site id is a string,
 * a profile is an object).
 */
export function profileForSite<P extends ProfileForSiteInput>(site: SiteId, profile: P, membership: MemberPublic | null): P;
export function profileForSite<P extends ProfileForSiteInput>(profile: P, membership: MemberPublic | null, site: SiteId): P;
export function profileForSite<P extends ProfileForSiteInput>(
  a: SiteId | P,
  b: P | MemberPublic | null,
  c: MemberPublic | SiteId | null,
): P {
  const [site, profile, membership] = typeof a === 'string'
    ? [a, b as P, c as MemberPublic | null]
    : [c as SiteId, a, b as MemberPublic | null];
  if (site === 'kpop') return profile;

  const out = { ...profile } as unknown as Record<string, unknown>;
  for (const [field, column] of Object.entries(PROFILE_FROM_MEMBERSHIP)) {
    const value = membership ? (membership as unknown as Record<string, unknown>)[column] : null;
    if (value !== null && value !== undefined) out[field] = value;
    else out[field] = field === 'display_name' ? profile.display_name : neutral(field);
  }

  const avatar = overrideOf(membership?.avatar_override);
  if (avatar.avatar_url !== undefined) out.avatar_url = avatar.avatar_url;
  if (avatar.avatar_bg !== undefined) out.avatar_bg = avatar.avatar_bg;
  if (avatar.avatar_text !== undefined) out.avatar_text = avatar.avatar_text;

  out.ult_groups = [];
  return out as P;
}
