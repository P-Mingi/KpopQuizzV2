// P10 settings model: the form draft, what changed, and the EXACT payload the
// legacy /settings page sends to /api/auth/update-profile (same keys, same value
// shapes: '' becomes null, stan_since a number, ult_groups an array). Only the
// changed fields are sent, so a round trip with nothing changed sends nothing
// (zero diff in profiles). Pure; unit-tested in settings-model.test.ts.

import { BIAS_MAX, isValidTheme, ULT_MAX } from '@/lib/passport-themes';
import { isValidNameAccent, isValidNameFont } from '@/lib/passport-flair';

export interface ProfileForm {
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  ult_groups: string[];
  bias: string;
  profile_theme: string;
  name_accent: string;
  name_font: string;
  pinned_badge_id: string | null;
  avatar_kind: string;
  avatar_ref: string | null;
  stan_since: string;
}

/** The profiles row as the settings page reads it. */
export interface ProfileRow {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  ult_groups: string[] | null;
  bias: string | null;
  profile_theme: string | null;
  name_accent: string | null;
  name_font: string | null;
  pinned_badge_id: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  stan_since: number | null;
}

/** Row -> form, with the same defaults as the legacy page. */
export function formFromRow(p: ProfileRow): ProfileForm {
  return {
    username: p.username,
    display_name: p.display_name ?? '',
    avatar_url: p.avatar_url ?? '',
    bio: p.bio ?? '',
    ult_groups: Array.isArray(p.ult_groups) ? [...p.ult_groups] : [],
    bias: p.bias ?? '',
    profile_theme: p.profile_theme ?? 'default',
    name_accent: p.name_accent ?? 'default',
    name_font: p.name_font ?? 'default',
    pinned_badge_id: p.pinned_badge_id ?? null,
    avatar_kind: p.avatar_kind ?? 'photo',
    avatar_ref: p.avatar_ref ?? null,
    stan_since: p.stan_since != null ? String(p.stan_since) : '',
  };
}

/** Payload for /api/auth/update-profile: changed fields only, legacy value shapes. */
export function profilePayload(base: ProfileForm, next: ProfileForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (next.username !== base.username) out.username = next.username;
  if (next.display_name !== base.display_name) out.display_name = next.display_name || null;
  if (next.avatar_url !== base.avatar_url) out.avatar_url = next.avatar_url || null;
  if (next.bio !== base.bio) out.bio = next.bio || null;
  if (JSON.stringify(next.ult_groups) !== JSON.stringify(base.ult_groups)) out.ult_groups = next.ult_groups;
  if (next.bias !== base.bias) out.bias = next.bias || null;
  if (next.profile_theme !== base.profile_theme) out.profile_theme = next.profile_theme;
  if (next.name_accent !== base.name_accent) out.name_accent = next.name_accent;
  if (next.name_font !== base.name_font) out.name_font = next.name_font;
  if (next.pinned_badge_id !== base.pinned_badge_id) out.pinned_badge_id = next.pinned_badge_id;
  if (next.avatar_kind !== base.avatar_kind) out.avatar_kind = next.avatar_kind;
  if (next.avatar_ref !== base.avatar_ref) out.avatar_ref = next.avatar_ref;
  if (next.stan_since !== base.stan_since) out.stan_since = next.stan_since ? parseInt(next.stan_since, 10) : null;
  return out;
}

/** Notification categories changed vs the loaded prefs (absent = on). */
export function prefsPayload(base: Record<string, boolean>, next: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(next)])) {
    const a = base[k] !== false;
    const b = next[k] !== false;
    if (a !== b) out[k] = b;
  }
  return out;
}

export type UsernameStatus = 'same' | 'checking' | 'available' | 'taken' | 'invalid';

/** Client-side username rules (the server checks again), legacy messages. */
export function usernameProblem(u: string, reserved: readonly string[]): string | null {
  if (!/^[a-z0-9_]+$/.test(u)) return 'Only lowercase letters, numbers and underscores';
  if (u.length < 3) return 'At least 3 characters';
  if (u.length > 20) return 'At most 20 characters';
  if (reserved.includes(u)) return 'This username is reserved';
  return null;
}

/** Local validation mirroring the server (fast answer, same limits). */
export function formProblems(f: ProfileForm): string[] {
  const out: string[] = [];
  if (f.display_name.length > 40) out.push('Display name must be 40 characters or less');
  if (f.bio.length > 160) out.push('Bio must be 160 characters or less');
  if (f.bias.length > BIAS_MAX) out.push(`Bias must be ${BIAS_MAX} characters or less`);
  if (f.ult_groups.length > ULT_MAX) out.push(`Pick at most ${ULT_MAX} groups`);
  if (f.avatar_url && !/^https?:\/\//.test(f.avatar_url)) out.push('The photo link must start with https://');
  if (!isValidTheme(f.profile_theme)) out.push('Invalid theme');
  if (!isValidNameAccent(f.name_accent)) out.push('Invalid name colour');
  if (!isValidNameFont(f.name_font)) out.push('Invalid name font');
  return out;
}
