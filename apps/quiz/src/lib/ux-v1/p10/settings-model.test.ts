import { describe, expect, it } from 'vitest';

import { RESERVED_USERNAMES } from '@/lib/constants';

import { formFromRow, formProblems, prefsPayload, profilePayload, usernameProblem } from './settings-model';

import type { ProfileRow } from './settings-model';

// The settings save bar posts ONLY changed fields, in the legacy /settings payload
// shapes, to /api/auth/update-profile. Nothing changed = nothing sent (zero diff).

const row: ProfileRow = {
  username: 'testtest', display_name: null, avatar_url: null, bio: null, ult_groups: null, bias: null, profile_theme: null,
  name_accent: null, name_font: null, pinned_badge_id: null, avatar_kind: null, avatar_ref: null, stan_since: null,
};

describe('profilePayload', () => {
  it('round trip with nothing changed sends nothing', () => {
    const f = formFromRow(row);
    expect(profilePayload(f, formFromRow(row))).toEqual({});
    const full: ProfileRow = { ...row, display_name: 'Mingi', avatar_url: 'https://a/b.png', bio: 'hi', ult_groups: ['bts'], bias: 'Han', profile_theme: 'teal', name_accent: 'pink', name_font: 'mono', pinned_badge_id: 'first_steps', avatar_kind: 'preset', avatar_ref: 'lilac', stan_since: 2019 };
    expect(profilePayload(formFromRow(full), formFromRow(full))).toEqual({});
  });

  it('changing a value and changing it back sends nothing', () => {
    const base = formFromRow(row);
    const next = { ...base, name_accent: 'purple' };
    expect(profilePayload(base, next)).toEqual({ name_accent: 'purple' });
    expect(profilePayload(base, { ...next, name_accent: 'default' })).toEqual({});
  });

  it('Your look fields go out with the legacy keys and value shapes', () => {
    const base = formFromRow(row);
    expect(profilePayload(base, { ...base, name_accent: 'teal', name_font: 'serif', bias: '3RACHA', profile_theme: 'amber', pinned_badge_id: 'first_steps' }))
      .toEqual({ name_accent: 'teal', name_font: 'serif', bias: '3RACHA', profile_theme: 'amber', pinned_badge_id: 'first_steps' });
  });

  it('empty strings become null, stan_since a number, ult_groups an array', () => {
    const base = formFromRow({ ...row, display_name: 'A', bio: 'B', bias: 'C', avatar_url: 'https://x/y.png', stan_since: 2019, pinned_badge_id: 'first_steps' });
    expect(profilePayload(base, { ...base, display_name: '', bio: '', bias: '', avatar_url: '', stan_since: '', pinned_badge_id: null }))
      .toEqual({ display_name: null, bio: null, bias: null, avatar_url: null, stan_since: null, pinned_badge_id: null });
    expect(profilePayload(base, { ...base, stan_since: '2021', ult_groups: ['stray-kids', 'bts'] })).toEqual({ stan_since: 2021, ult_groups: ['stray-kids', 'bts'] });
  });

  it('defaults match the legacy page (null accent = default, null theme = default)', () => {
    const f = formFromRow(row);
    expect([f.name_accent, f.name_font, f.profile_theme, f.avatar_kind]).toEqual(['default', 'default', 'default', 'photo']);
  });
});

describe('prefsPayload', () => {
  it('absent means on; only real changes are sent', () => {
    expect(prefsPayload({}, {})).toEqual({});
    expect(prefsPayload({}, { social: true })).toEqual({});
    expect(prefsPayload({}, { social: false })).toEqual({ social: false });
    expect(prefsPayload({ social: false }, { social: true })).toEqual({ social: true });
    expect(prefsPayload({ social: false }, { social: false, announcements: true })).toEqual({});
  });
});

describe('validation mirrors the server', () => {
  it('usernames', () => {
    expect(usernameProblem('ok_name1', RESERVED_USERNAMES)).toBeNull();
    expect(usernameProblem('No', RESERVED_USERNAMES)).toMatch(/lowercase/);
    expect(usernameProblem('ab', RESERVED_USERNAMES)).toMatch(/3/);
    expect(usernameProblem('a'.repeat(21), RESERVED_USERNAMES)).toMatch(/20/);
    expect(usernameProblem(RESERVED_USERNAMES[0] as string, RESERVED_USERNAMES)).toMatch(/reserved/);
  });
  it('form limits', () => {
    const f = formFromRow(row);
    expect(formProblems(f)).toEqual([]);
    expect(formProblems({ ...f, bio: 'x'.repeat(161), bias: 'y'.repeat(41), avatar_url: 'ftp://x', ult_groups: ['a', 'b', 'c', 'd'] })).toHaveLength(4);
    expect(formProblems({ ...f, name_accent: 'neon' })).toEqual(['Invalid name colour']);
  });
});
