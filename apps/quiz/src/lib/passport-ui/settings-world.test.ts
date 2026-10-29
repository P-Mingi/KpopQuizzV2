// Run O1, lot (b), lane P1: the settings of a world site: the words, how the rows become a form, how the form becomes the
// three kinds of write (membership patch, shared profile flair, followed series), and that nothing of kpop shows.
import { describe, expect, it } from 'vitest';

import { AVATAR_PRESETS } from '@/lib/passport-flair';
import { MEMBERSHIP_PATCH_KEYS_NON_KPOP } from '@/lib/passport/types';

import {
  avatarOverrideOf, hasWrites, seriesRows, settingsWorld, worldFormFromRows, worldProblems, worldWrites,
} from './settings-world';

import type { WorldMembershipRow, WorldProfileRow } from './settings-world';

const profile: WorldProfileRow = {
  username: 'mina', display_name: 'Mina', avatar_url: 'https://img/mina.png', avatar_bg: '#112233', avatar_text: '#ffffff',
  name_accent: 'pink', name_font: 'serif', avatar_kind: 'photo', avatar_ref: null,
};
const membership: WorldMembershipRow = {
  display_name_override: 'Mina of the sea', bio: 'Hello', tag_text: 'Gojo', profile_theme: 'blue', pinned_badge_id: 'first_steps',
  avatar_override: null, since_year: 2015, header_url: null, xp: 1280,
};

describe('settingsWorld', () => {
  it('is undefined on kpop, and carries the anime words, star and both sign-out modes on anime', () => {
    expect(settingsWorld('kpop')).toBeUndefined();
    const w = settingsWorld('anime')!;
    expect(w.pickIcon).toBe('star');
    expect(w.signOutModes).toEqual(['global', 'local']);
    expect(w.words.signOutHere).toBe('Sign out of OtakuQuiz only');
    expect(w.words.signOutEverywhere).toBe('Sign out everywhere');
    expect(w.words.passportRow).toBe('Bunnyverse passport');
    expect(w.words.oshi).toBe('Oshi');
    expect(w.passportHref).toBe('/auth/passport/out?to=hub&next=%2Fpassport&via=a.pp');
  });
  it('says no K-pop word and no dash anywhere', () => {
    const text = JSON.stringify(settingsWorld('anime'));
    expect(text).not.toMatch(/k-?pop|idol|group|stan|bias|discord/i);
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('worldFormFromRows', () => {
  it('takes the presentation from the membership over the shared identity', () => {
    const f = worldFormFromRows(profile, membership, ['frieren', 'jujutsu-kaisen']);
    expect(f).toMatchObject({
      username: 'mina', display_name: 'Mina of the sea', bio: 'Hello', bias: 'Gojo', profile_theme: 'blue', pinned_badge_id: 'first_steps',
      stan_since: '2015', ult_groups: ['frieren', 'jujutsu-kaisen'], name_accent: 'pink', name_font: 'serif', avatar_url: 'https://img/mina.png',
    });
  });
  it('a member with no membership yet starts from the shared name and empty presentation, never a kpop value', () => {
    const f = worldFormFromRows(profile, null, []);
    expect(f).toMatchObject({ display_name: 'Mina', bio: '', bias: '', stan_since: '', profile_theme: 'default', ult_groups: [], pinned_badge_id: null });
  });
  it('reads a preset back from the colours of the avatar override', () => {
    const [key, p] = Object.entries(AVATAR_PRESETS)[0]!;
    const f = worldFormFromRows(profile, { ...membership, avatar_override: { avatar_url: null, avatar_bg: p.bg, avatar_text: p.fg } }, []);
    expect(f.avatar_kind).toBe('preset');
    expect(f.avatar_ref).toBe(key);
  });
});

describe('worldWrites', () => {
  const base = worldFormFromRows(profile, membership, ['frieren']);

  it('nothing changed: nothing to write', () => {
    expect(hasWrites(worldWrites(base, { ...base }))).toBe(false);
  });
  it('sends only the changed fields, under the membership column names, and only keys update_my_membership accepts', () => {
    const w = worldWrites(base, { ...base, display_name: 'New name', bio: '', bias: '', stan_since: '2020', profile_theme: 'teal', pinned_badge_id: null });
    expect(w.membership).toEqual({ display_name_override: 'New name', bio: null, tag_text: null, since_year: 2020, profile_theme: 'teal', pinned_badge_id: null });
    for (const k of Object.keys(w.membership)) expect(MEMBERSHIP_PATCH_KEYS_NON_KPOP as readonly string[]).toContain(k);
    expect(w.profile).toEqual({});
    expect(w.series).toBeNull();
  });
  it('the name colour and the name font stay on the shared profile', () => {
    const w = worldWrites(base, { ...base, name_accent: 'teal', name_font: 'mono' });
    expect(w.profile).toEqual({ name_accent: 'teal', name_font: 'mono' });
    expect(w.membership).toEqual({});
  });
  it('a change of the followed series is sent whole, in order', () => {
    expect(worldWrites(base, { ...base, ult_groups: ['naruto', 'frieren'] }).series).toEqual(['naruto', 'frieren']);
    expect(worldWrites(base, { ...base, ult_groups: [] }).series).toEqual([]);
  });
  it('a photo link, a preset or neither become the avatar override', () => {
    expect(avatarOverrideOf({ avatar_url: 'https://img/a.png', avatar_kind: 'photo', avatar_ref: null })).toEqual({ avatar_url: 'https://img/a.png' });
    expect(avatarOverrideOf({ avatar_url: '', avatar_kind: 'photo', avatar_ref: null })).toBeNull();
    const [key, p] = Object.entries(AVATAR_PRESETS)[0]!;
    expect(avatarOverrideOf({ avatar_url: 'https://img/a.png', avatar_kind: 'preset', avatar_ref: key })).toEqual({ avatar_url: null, avatar_bg: p.bg, avatar_text: p.fg });
    expect(worldWrites(base, { ...base, avatar_url: '' }).membership).toEqual({ avatar_override: null });
  });
});

describe('seriesRows and worldProblems', () => {
  it('one favourites row per series in the topic slot, ranks in order, the label cut to 40, at most three', () => {
    const rows = seriesRows('u1', 'anime', [{ slug: 'a', name: 'A' }, { slug: 'b', name: 'B'.repeat(60) }, { slug: 'c', name: 'C' }, { slug: 'd', name: 'D' }]);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({ user_id: 'u1', site_id: 'anime', slot: 'topic', rank: 1, entity_type: 'series', entity_id: 'b', label: 'B'.repeat(40) });
    expect(rows.map((r) => r.rank)).toEqual([0, 1, 2]);
  });
  it('flags a too long name, bio or tag, too many series, and a photo link that is not https', () => {
    const f = worldFormFromRows(profile, membership, []);
    expect(worldProblems(f)).toEqual([]);
    expect(worldProblems({ ...f, display_name: 'x'.repeat(41), bio: 'y'.repeat(161), bias: 'z'.repeat(41), ult_groups: ['a', 'b', 'c', 'd'], avatar_url: 'http://x' })).toHaveLength(5);
  });
});
