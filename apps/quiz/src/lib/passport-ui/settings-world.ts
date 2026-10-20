// Run O1, lot (b), lane P1: /settings of a world site (anime). The shared kpop settings (components/profile/ux-v1/settings)
// take a `world` prop built here (rule 18): the words, the series and oshi sections, the account rows, and how the form
// becomes writes. Pure and isomorphic; the browser calls them. kpop gets undefined and runs its own code.
//
// What is written where (rpcs.md 2 and 5):
//  - the presentation of this site (name, bio, header, theme, pinned badge, oshi tag, watching since, photo) goes to the
//    membership with update_my_membership (MEMBERSHIP_PATCH_KEYS_NON_KPOP);
//  - the name colour and name font stay on the shared profile (they travel with the account), through the existing
//    /api/auth/update-profile;
//  - the series the member follows go to `favourites` (slot topic, entity_type series), through RLS;
//  - the oshi of a series goes to `favourite_characters`, through RLS (lib/passport-ui/oshi.ts).

import { siteConfig } from '@/lib/site/registry';
import { AVATAR_PRESETS } from '@/lib/passport-flair';
import { ULT_MAX } from '@/lib/passport-themes';

import { p1 } from './copy';

import type { MembershipAvatarOverride, MembershipPatch } from '@/lib/passport/types';
import type { PickIcon, SignOutMode, SiteId } from '@/lib/site/types';
import type { ProfileForm } from '@/lib/ux-v1/p10/settings-model';

/** The strings of the world settings. Templates keep `{max}`, `{count}`, `{name}`, `{username}`, `{year}` for the component. */
export interface SettingsWords {
  readonly profile: string;
  readonly displayName: string;
  readonly photo: string;
  readonly bio: string;
  readonly header: string;
  readonly anime: string;
  readonly animeLead: string;
  readonly yourSeries: string;
  readonly addSeries: string;
  readonly seriesHelp: string;
  readonly seriesSearch: string;
  readonly noSeries: string;
  readonly mainTag: string;
  readonly oshi: string;
  readonly oshiNone: string;
  readonly oshiNeedSeries: string;
  readonly oshiLocked: string;
  readonly oshiPick: string;
  readonly oshiCustom: string;
  readonly oshiRefused: string;
  readonly watchingSince: string;
  readonly look: string;
  readonly notifications: string;
  readonly appearance: string;
  readonly account: string;
  readonly username: string;
  readonly announcements: string;
  readonly emailSoon: string;
  readonly passportRow: string;
  readonly passportSub: string;
  readonly signOutEverywhere: string;
  readonly signOutEverywhereSub: string;
  readonly signOutHere: string;
  readonly signOutHereSub: string;
  readonly brand: string;
  readonly domain: string;
}

export interface SettingsWorld {
  readonly site: SiteId;
  readonly words: SettingsWords;
  readonly pickIcon: PickIcon;
  readonly seriesMax: number;
  readonly signOutModes: readonly SignOutMode[];
  /** Same-origin jump to the whole passport on the network site (apis.md 2.1). */
  readonly passportHref: string;
}

export function settingsWorld(site: SiteId): SettingsWorld | undefined {
  if (site === 'kpop') return undefined;
  const cfg = siteConfig(site);
  const t = (key: Parameters<typeof p1>[0]): string => p1(key, {}, site);
  return {
    site,
    pickIcon: cfg.vocabulary.favourites.pickIcon,
    seriesMax: ULT_MAX,
    signOutModes: cfg.auth.signOutModes,
    passportHref: `/auth/passport/out?to=hub&next=${encodeURIComponent('/passport')}&via=${cfg.letter}.pp`,
    words: {
      profile: t('settings.profile'), displayName: t('settings.displayName'), photo: t('settings.photo'), bio: t('settings.bio'),
      header: t('settings.header'), anime: t('settings.anime'), animeLead: t('settings.animeLead'), yourSeries: t('settings.yourSeries'),
      addSeries: t('settings.addSeries'), seriesHelp: t('settings.seriesHelp'), seriesSearch: t('settings.seriesSearch'),
      noSeries: t('settings.noSeries'), mainTag: t('settings.mainTag'), oshi: t('settings.oshi'), oshiNone: t('settings.oshiNone'),
      oshiNeedSeries: t('settings.oshiNeedSeries'), oshiLocked: t('settings.oshiLocked'), oshiPick: t('oshi.pick'),
      oshiCustom: t('oshi.custom'), oshiRefused: t('oshi.refusedSpoiler'), watchingSince: t('settings.watchingSince'),
      look: t('settings.look'), notifications: t('settings.notifications'), appearance: t('settings.appearance'),
      account: t('settings.account'), username: t('settings.username'), announcements: t('settings.announcements'),
      emailSoon: t('settings.emailSoon'), passportRow: t('account.passportRow'), passportSub: t('account.passportSub'),
      signOutEverywhere: t('account.signOutEverywhere'), signOutEverywhereSub: t('account.signOutEverywhereSub'),
      signOutHere: t('account.signOutHere'), signOutHereSub: t('account.signOutHereSub'),
      brand: cfg.brand.name, domain: cfg.domain,
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Rows -> form
// ---------------------------------------------------------------------------------------------------------------

/** The columns of the shared profile the world settings read. */
export const WORLD_PROFILE_SELECT = 'username, display_name, avatar_url, avatar_bg, avatar_text, name_accent, name_font, avatar_kind, avatar_ref';
/** The membership columns the world settings read (the owner reads their own row). */
export const WORLD_MEMBERSHIP_SELECT = 'display_name_override, bio, tag_text, profile_theme, pinned_badge_id, avatar_override, since_year, header_url, xp';

export interface WorldProfileRow {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  name_accent: string | null;
  name_font: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
}

export interface WorldMembershipRow {
  display_name_override: string | null;
  bio: string | null;
  tag_text: string | null;
  profile_theme: string | null;
  pinned_badge_id: string | null;
  avatar_override: MembershipAvatarOverride | null;
  since_year: number | null;
  header_url: string | null;
  xp: number | null;
}

/** The form a member of this site sees: the membership's presentation over the shared profile's identity. */
export function worldFormFromRows(profile: WorldProfileRow, m: WorldMembershipRow | null, seriesSlugs: readonly string[]): ProfileForm {
  const override = m?.avatar_override ?? null;
  const preset = presetOf(override);
  return {
    username: profile.username,
    display_name: m?.display_name_override ?? profile.display_name ?? '',
    avatar_url: override && override.avatar_url !== undefined ? override.avatar_url ?? '' : profile.avatar_url ?? '',
    bio: m?.bio ?? '',
    ult_groups: [...seriesSlugs],
    bias: m?.tag_text ?? '',
    profile_theme: m?.profile_theme ?? 'default',
    name_accent: profile.name_accent ?? 'default',
    name_font: profile.name_font ?? 'default',
    pinned_badge_id: m?.pinned_badge_id ?? null,
    avatar_kind: preset ? 'preset' : 'photo',
    avatar_ref: preset,
    stan_since: m?.since_year != null ? String(m.since_year) : '',
  };
}

/** The preset key whose colours the override carries, or null. */
function presetOf(o: MembershipAvatarOverride | null): string | null {
  if (!o || o.avatar_bg === undefined) return null;
  for (const [key, p] of Object.entries(AVATAR_PRESETS)) if (p.bg === o.avatar_bg && p.fg === o.avatar_text) return key;
  return null;
}

/** The avatar override a form stands for: a photo link, or a preset's colours (and no photo), or none at all. */
export function avatarOverrideOf(form: Pick<ProfileForm, 'avatar_url' | 'avatar_kind' | 'avatar_ref'>): MembershipAvatarOverride | null {
  if (form.avatar_kind === 'preset' && form.avatar_ref) {
    const p = AVATAR_PRESETS[form.avatar_ref];
    if (p) return { avatar_url: null, avatar_bg: p.bg, avatar_text: p.fg };
  }
  return form.avatar_url ? { avatar_url: form.avatar_url } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Form -> writes
// ---------------------------------------------------------------------------------------------------------------

export interface WorldWrites {
  /** Keys of update_my_membership (MEMBERSHIP_PATCH_KEYS_NON_KPOP); empty when nothing changed. */
  readonly membership: MembershipPatch;
  /** name_accent / name_font, for /api/auth/update-profile; empty when nothing changed. */
  readonly profile: Readonly<Record<string, string>>;
  /** The followed series, in order, when they changed; null when they did not. */
  readonly series: readonly string[] | null;
}

/** What changed between the loaded form and the edited one, as the three kinds of write. Only changed fields are sent. */
export function worldWrites(base: ProfileForm, next: ProfileForm): WorldWrites {
  const membership: Record<string, unknown> = {};
  if (next.display_name !== base.display_name) membership.display_name_override = next.display_name.trim() || null;
  if (next.bio !== base.bio) membership.bio = next.bio || null;
  if (next.bias !== base.bias) membership.tag_text = next.bias || null;
  if (next.profile_theme !== base.profile_theme) membership.profile_theme = next.profile_theme;
  if (next.pinned_badge_id !== base.pinned_badge_id) membership.pinned_badge_id = next.pinned_badge_id;
  if (next.stan_since !== base.stan_since) membership.since_year = next.stan_since ? parseInt(next.stan_since, 10) : null;
  if (next.avatar_url !== base.avatar_url || next.avatar_kind !== base.avatar_kind || next.avatar_ref !== base.avatar_ref) {
    membership.avatar_override = avatarOverrideOf(next);
  }
  const profile: Record<string, string> = {};
  if (next.name_accent !== base.name_accent) profile.name_accent = next.name_accent;
  if (next.name_font !== base.name_font) profile.name_font = next.name_font;
  const series = JSON.stringify(next.ult_groups) !== JSON.stringify(base.ult_groups) ? [...next.ult_groups] : null;
  return { membership: membership as MembershipPatch, profile, series };
}

export function hasWrites(w: WorldWrites): boolean {
  return Object.keys(w.membership).length > 0 || Object.keys(w.profile).length > 0 || w.series !== null;
}

/** The `favourites` rows (slot topic) for the followed series, in order. `label` is the series name cut to the column's 40. */
export function seriesRows(userId: string, site: SiteId, picked: ReadonlyArray<{ slug: string; name: string }>): Array<Record<string, unknown>> {
  return picked.slice(0, ULT_MAX).map((s, rank) => ({
    user_id: userId, site_id: site, slot: 'topic', rank, entity_type: siteConfig(site).vocabulary.favourites.topicEntityType, entity_id: s.slug, label: s.name.slice(0, 40),
  }));
}

/** Local validation of the world form (the database checks again). */
export function worldProblems(f: ProfileForm): string[] {
  const out: string[] = [];
  if (f.display_name.length > 40) out.push('Display name must be 40 characters or less');
  if (f.bio.length > 160) out.push('Bio must be 160 characters or less');
  if (f.bias.length > 40) out.push('The tag must be 40 characters or less');
  if (f.ult_groups.length > ULT_MAX) out.push(`Pick at most ${ULT_MAX} series`);
  if (f.avatar_url && !/^https:\/\//.test(f.avatar_url)) out.push('The photo link must start with https://');
  return out;
}
