// Run O1, lot (b), lane P1: the data of the passport pages of a world site (membership missing, not activated, banned,
// activated) and the shapes it feeds to the shared components. A stand-in for Supabase, nothing leaves the process.
import { describe, expect, it } from 'vitest';

import { MEMBER_PRIVATE_COLUMNS } from '@/lib/passport/types';

import { fakeDb } from './test-support';
import {
  MEMBER_COLUMNS, PROFILE_COLUMNS, effectiveStreak, publicOnly, readOwnWorldMember, readSeriesSlugs, readWorldMember, worldCollection,
  worldGroupStats, worldSpine,
} from './world-reads';

import type { PassportGroupStat } from '@/lib/passport';
import type { MemberPublic } from '@/lib/passport/types';

const profile = {
  id: 'u1', username: 'mina', display_name: 'Mina', avatar_url: null, avatar_bg: '#112233', avatar_text: '#ffffff',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', name_accent: 'pink', name_font: 'default',
  avatar_kind: 'photo', avatar_ref: null, banned_at: null,
  // the kpop presentation, which a world read must never carry onto a page
  bio: 'K-pop bio', bias: 'Jimin', ult_groups: ['bts'], header_url: 'https://x/y.png', xp: 99999,
};
const membership = {
  user_id: 'u1', site_id: 'anime', joined_at: '2026-03-01T00:00:00Z', activated_at: '2026-03-02T00:00:00Z', banned_at: null, show_elsewhere: false,
  xp: 1280, quizzes_played: 40, blindtests_played: 7, games_played: 2, quizzes_created: 3, plays_received: 90, likes_received: 12,
  follower_count: 5, following_count: 1, daily_streak: 4, daily_streak_longest: 9, last_daily_date: '2026-10-20',
  bio: 'Watching since forever', header_url: null, profile_theme: 'blue', pinned_badge_id: null, display_name_override: 'Mina of the sea',
  avatar_override: { avatar_bg: '#ff0000' }, tag_text: 'Gojo', since_year: 2015,
  // private columns
  joined_via: 'signup', via_code: 'k.menu', first_play_at: '2026-03-03T00:00:00Z', auto_continue: false, notice_seen_at: null, last_seen_at: null,
};

describe('readWorldMember (another member of this site)', () => {
  it('asks the profile for identity columns only and the membership for public and filter columns, never a private one', async () => {
    const db = fakeDb({ profiles: [profile], world_memberships: [membership] });
    await readWorldMember(db.client, 'mina', 'anime');
    const asked = db.selects.map((s) => s.columns).join(',');
    for (const col of MEMBER_PRIVATE_COLUMNS) expect(asked).not.toContain(col);
    expect(PROFILE_COLUMNS).not.toMatch(/\b(bio|bias|ult_groups|header_url|xp|stan_since|profile_theme)\b/);
    expect(MEMBER_COLUMNS).toContain('xp');
    expect(MEMBER_COLUMNS).toContain('banned_at');
  });

  it('activated: the profile as this site shows it, with the membership values and no kpop presentation', async () => {
    const db = fakeDb({ profiles: [profile], world_memberships: [membership] });
    const r = await readWorldMember(db.client, 'mina', 'anime');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.member.profile as unknown as Record<string, unknown>;
    expect(p.xp).toBe(1280);
    expect(p.display_name).toBe('Mina of the sea');
    expect(p.bio).toBe('Watching since forever');
    expect(p.bias).toBe('Gojo');
    expect(p.stan_since).toBe(2015);
    expect(p.profile_theme).toBe('blue');
    expect(p.ult_groups).toEqual([]);
    expect(p.avatar_bg).toBe('#ff0000');
    expect(JSON.stringify(p)).not.toMatch(/K-pop|Jimin|bts/);
  });

  it('the membership handed on holds public columns only (no user id, no ban, no private column)', async () => {
    const db = fakeDb({ profiles: [profile], world_memberships: [membership] });
    const r = await readWorldMember(db.client, 'mina', 'anime');
    if (!r.ok) throw new Error('expected a member');
    const keys = Object.keys(r.member.membership);
    for (const k of ['user_id', 'activated_at', 'banned_at', 'show_elsewhere', ...MEMBER_PRIVATE_COLUMNS]) expect(keys).not.toContain(k);
    expect(keys).toContain('xp');
  });

  it('no profile with that username: refused', async () => {
    expect(await readWorldMember(fakeDb({ profiles: [], world_memberships: [] }).client, 'nobody', 'anime')).toEqual({ ok: false, reason: 'no_profile' });
  });

  it('membership missing on this site (a member of another site only): refused', async () => {
    const db = fakeDb({ profiles: [profile], world_memberships: [{ ...membership, site_id: 'hub' }] });
    expect(await readWorldMember(db.client, 'mina', 'anime')).toEqual({ ok: false, reason: 'no_membership' });
  });

  it('not activated: refused', async () => {
    const db = fakeDb({ profiles: [profile], world_memberships: [{ ...membership, activated_at: null }] });
    expect(await readWorldMember(db.client, 'mina', 'anime')).toEqual({ ok: false, reason: 'not_activated' });
  });

  it('banned on the site, or network-wide on the profile: refused', async () => {
    const onSite = fakeDb({ profiles: [profile], world_memberships: [{ ...membership, banned_at: '2026-10-01T00:00:00Z' }] });
    expect(await readWorldMember(onSite.client, 'mina', 'anime')).toEqual({ ok: false, reason: 'banned' });
    const wide = fakeDb({ profiles: [{ ...profile, banned_at: '2026-10-01T00:00:00Z' }], world_memberships: [membership] });
    expect(await readWorldMember(wide.client, 'mina', 'anime')).toEqual({ ok: false, reason: 'banned' });
  });

  it('a failed read throws (a failed read is never cached by ISR)', async () => {
    await expect(readWorldMember(fakeDb({ profiles: [profile] }, new Set(['world_memberships'])).client, 'mina', 'anime')).rejects.toThrow(/membership/);
    await expect(readWorldMember(fakeDb({}, new Set(['profiles'])).client, 'mina', 'anime')).rejects.toThrow(/profile/);
  });
});

describe('readOwnWorldMember (the signed-in user)', () => {
  it('a member: the profile as this site shows it, stamped, not banned', async () => {
    const own = await readOwnWorldMember(fakeDb({ profiles: [profile], world_memberships: [membership] }).client, 'u1', 'anime');
    expect(own?.stamped).toBe(true);
    expect(own?.banned).toBe(false);
    expect(own?.profile.xp).toBe(1280);
  });

  it('no membership yet: neutral values, never the kpop ones', async () => {
    const own = await readOwnWorldMember(fakeDb({ profiles: [profile], world_memberships: [] }).client, 'u1', 'anime');
    expect(own?.stamped).toBe(false);
    expect(own?.membership).toBeNull();
    const p = own!.profile as unknown as Record<string, unknown>;
    expect(p.xp).toBe(0);
    expect(p.bio).toBe('');
    expect(p.bias).toBeNull();
    expect(p.display_name).toBe('Mina');
  });

  it('banned on the site or on the profile; no profile at all', async () => {
    expect((await readOwnWorldMember(fakeDb({ profiles: [profile], world_memberships: [{ ...membership, banned_at: 'x' }] }).client, 'u1', 'anime'))?.banned).toBe(true);
    expect((await readOwnWorldMember(fakeDb({ profiles: [{ ...profile, banned_at: 'x' }], world_memberships: [] }).client, 'u1', 'anime'))?.banned).toBe(true);
    expect(await readOwnWorldMember(fakeDb({ profiles: [], world_memberships: [] }).client, 'u1', 'anime')).toBeNull();
  });
});

describe('the spine, the collection and the streak of a world member', () => {
  const m = publicOnly(membership as unknown as MemberPublic);

  it('worldSpine takes everything from the membership, with no kpop group and no duels', () => {
    const s = worldSpine(m, ['jujutsu-kaisen', 'frieren'], new Date('2026-10-20T10:00:00Z'));
    expect(s).toMatchObject({ xp: 1280, quizzes_played: 40, blindtests_played: 7, total_quizzes_created: 3, bias: 'Gojo', profile_theme: 'blue', streak_current: 4, streak_longest: 9, duels_voted: 0, ult_groups: ['jujutsu-kaisen', 'frieren'] });
    expect(worldSpine(null, []).xp).toBe(0);
    expect(worldSpine(null, []).bias).toBeNull();
  });

  it('a streak is live only while its last day is today or yesterday', () => {
    const now = new Date('2026-10-20T10:00:00Z');
    expect(effectiveStreak(5, '2026-10-20', now)).toBe(5);
    expect(effectiveStreak(5, '2026-10-19', now)).toBe(5);
    expect(effectiveStreak(5, '2026-10-18', now)).toBe(0);
    expect(effectiveStreak(5, null, now)).toBe(0);
  });

  const stat = (group_id: number, mastered: boolean): PassportGroupStat => ({ group_id, songs_played: 40, songs_correct: 36, best_score: 0, mastery_level: 1, mastered, accuracy: 0.9 });

  it('counts mastery over the series of this site only', () => {
    const stats = [stat(1, true), stat(2, true), stat(3, false), stat(900, true)];
    const ids = new Set([1, 3, 4]);
    expect(worldCollection(stats, ids)).toEqual({ groups_mastered: 1, groups_total: 3, eras: [] });
    expect(worldGroupStats(stats, ids).map((s) => s.group_id)).toEqual([1, 3]);
  });

  it('readSeriesSlugs: the followed series in rank order, blanks dropped', async () => {
    const db = fakeDb({ favourites: [
      { user_id: 'u1', site_id: 'anime', slot: 'topic', rank: 0, entity_id: 'frieren' },
      { user_id: 'u1', site_id: 'anime', slot: 'topic', rank: 1, entity_id: '' },
      { user_id: 'u1', site_id: 'anime', slot: 'pick', rank: 0, entity_id: '12' },
      { user_id: 'u2', site_id: 'anime', slot: 'topic', rank: 0, entity_id: 'other' },
    ] });
    expect(await readSeriesSlugs(db.client, 'u1', 'anime')).toEqual(['frieren']);
  });
});
