// Run O1, lot (c) part 2 (B3): profileForSite (rpcs.md 3, types.ts PROFILE_FROM_MEMBERSHIP). Pure.
import { describe, expect, it } from 'vitest';

import { PROFILE_FROM_MEMBERSHIP } from '@/lib/passport/types';

import { profileForSite } from './profile';

import type { MemberPublic, PassportServerFns, ProfileForSiteInput } from '@/lib/passport/types';

const PROFILE: ProfileForSiteInput = {
  id: 'u1', username: 'fan', display_name: 'Fan Name', avatar_url: 'https://img.test/kpop.png', avatar_bg: '#111111',
  avatar_text: '#eeeeee', bio: 'I stan K-pop', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
  total_quizzes_created: 12, total_plays_received: 340, total_likes_received: 56, xp: 9000, follower_count: 7,
  following_count: 8, name_accent: 'pink', name_font: 'serif', pinned_badge_id: 'multi_stan', avatar_kind: 'idol',
  avatar_ref: 'karina', stan_since: 2016, header_url: 'https://img.test/kpop-header.png', bias: 'Karina',
  ult_groups: [{ slug: 'aespa' }], profile_theme: 'kpop-pink',
};

const MEMBER: MemberPublic = {
  site_id: 'anime', joined_at: '2026-10-01T00:00:00Z', xp: 150, quizzes_played: 4, blindtests_played: 1, games_played: 0,
  quizzes_created: 2, plays_received: 30, likes_received: 5, follower_count: 3, following_count: 4, daily_streak: 2,
  daily_streak_longest: 6, last_daily_date: '2026-10-18', bio: 'Anime fan', header_url: 'https://img.test/anime.png',
  profile_theme: 'otaku', pinned_badge_id: 'anime_first_steps', display_name_override: 'Otaku Fan',
  avatar_override: { avatar_bg: '#222222' }, tag_text: 'Frieren', since_year: 2021,
};

describe('profileForSite', () => {
  it('satisfies the contract signature (a drift fails tsc)', () => {
    const contract: PassportServerFns['profileForSite'] = profileForSite;
    expect(contract).toBe(profileForSite);
  });

  it('on kpop it returns the very same object, whatever the membership is', () => {
    expect(profileForSite('kpop', PROFILE, null)).toBe(PROFILE);
    expect(profileForSite('kpop', PROFILE, MEMBER)).toBe(PROFILE);
  });

  it('on another site every key of PROFILE_FROM_MEMBERSHIP takes the membership value', () => {
    const p = profileForSite('anime', PROFILE, MEMBER);
    expect(p).not.toBe(PROFILE);
    expect(p).toMatchObject({
      display_name: 'Otaku Fan', bio: 'Anime fan', header_url: 'https://img.test/anime.png', profile_theme: 'otaku',
      pinned_badge_id: 'anime_first_steps', stan_since: 2021, bias: 'Frieren', xp: 150, total_quizzes_created: 2,
      total_plays_received: 30, total_likes_received: 5, follower_count: 3, following_count: 4,
    });
    for (const field of Object.keys(PROFILE_FROM_MEMBERSHIP)) expect(p).toHaveProperty(field);
  });

  it('the avatar_override keys replace the profiles columns of the same name, the others keep the profiles value', () => {
    const p = profileForSite('anime', PROFILE, MEMBER);
    expect(p.avatar_bg).toBe('#222222');
    expect(p.avatar_text).toBe('#eeeeee');
    expect(p.avatar_url).toBe('https://img.test/kpop.png');
    const all = profileForSite('anime', PROFILE, {
      ...MEMBER, avatar_override: { avatar_url: null, avatar_bg: '#333333', avatar_text: '#ffffff' },
    });
    expect(all).toMatchObject({ avatar_url: null, avatar_bg: '#333333', avatar_text: '#ffffff' });
  });

  it('ult_groups is [] and no K-pop text survives from the profile on another site', () => {
    const p = profileForSite('anime', PROFILE, MEMBER);
    expect(p.ult_groups).toEqual([]);
    expect(JSON.stringify(p)).not.toContain('Karina');
    expect(JSON.stringify(p)).not.toContain('I stan K-pop');
    expect(JSON.stringify(p)).not.toContain('kpop-header');
  });

  it('a null membership value becomes the neutral value and never falls back to the kpop value', () => {
    const empty: MemberPublic = {
      ...MEMBER, xp: 0, bio: null, header_url: null, profile_theme: null, pinned_badge_id: null, display_name_override: null,
      avatar_override: null, tag_text: null, since_year: null, quizzes_created: 0, plays_received: 0, likes_received: 0,
      follower_count: 0, following_count: 0,
    };
    const p = profileForSite('anime', PROFILE, empty);
    expect(p).toMatchObject({
      bio: '', header_url: null, profile_theme: null, pinned_badge_id: null, stan_since: null, bias: null, xp: 0,
      total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0, follower_count: 0, following_count: 0,
      display_name: 'Fan Name', // the one fallback
      avatar_bg: '#111111',
    });
    const nulls = profileForSite('anime', PROFILE, {
      ...MEMBER, xp: null, quizzes_created: null, follower_count: null,
    } as unknown as MemberPublic);
    expect(nulls).toMatchObject({ xp: 0, total_quizzes_created: 0, follower_count: 0 });
  });

  it('no membership at all: the neutral values everywhere, display_name kept', () => {
    const p = profileForSite('hub', PROFILE, null);
    expect(p).toMatchObject({
      display_name: 'Fan Name', bio: '', header_url: null, profile_theme: null, pinned_badge_id: null, stan_since: null, bias: null,
      xp: 0, total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0, follower_count: 0, following_count: 0,
      ult_groups: [],
    });
  });

  it('accepts the order of the lot (c) brief, (profile, membership, site), with the same answers', () => {
    expect(profileForSite(PROFILE, MEMBER, 'kpop')).toBe(PROFILE);
    expect(profileForSite(PROFILE, null, 'kpop')).toBe(PROFILE);
    expect(profileForSite(PROFILE, MEMBER, 'anime')).toEqual(profileForSite('anime', PROFILE, MEMBER));
    expect(profileForSite(PROFILE, null, 'hub')).toEqual(profileForSite('hub', PROFILE, null));
  });

  it('is pure: the input is not changed, and the fields outside the mapping are kept', () => {
    const before = JSON.stringify(PROFILE);
    const p = profileForSite('anime', PROFILE, MEMBER);
    expect(JSON.stringify(PROFILE)).toBe(before);
    expect(p).toMatchObject({ id: 'u1', username: 'fan', created_at: PROFILE.created_at, name_accent: 'pink' });
  });
});
