// Run O1, lot (b), lane P1: the data of /me and /u/{username} on the anime build, end to end over a stand-in for Supabase:
// the member page of a non-member, of a member not activated, of a banned one (all 404), the activated one rendered by the
// shared passport with no K-pop word, and /me for a guest, a user with no profile, a banned user and a member.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb } from './test-support';

import type { Rows } from './test-support';

const state = vi.hoisted(() => ({ user: null as { id: string } | null, rows: {} as Record<string, Array<Record<string, unknown>>>, stamps: 1 }));

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`); },
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/me',
}));
vi.mock('@/lib/supabase/server', async () => {
  const { fakeDb: fake } = await import('./test-support');
  const client = () => {
    const db = fake(state.rows).client as unknown as Record<string, unknown>;
    return { ...db, auth: { getUser: async () => ({ data: { user: state.user } }) }, rpc: async (fn: string) => ({ data: fn === 'my_passport' ? Array.from({ length: state.stamps }, () => ({})) : null, error: null }) };
  };
  return { createServerClient: async () => client(), createServiceRoleClient: () => client(), createPublicReadClient: () => client() };
});
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizzesByCreator: async () => [] }));
vi.mock('@/lib/badges/award', () => ({ computeMetrics: async () => null, grantEarnedTiers: async () => [] }));
vi.mock('@/lib/passport', async (orig) => ({ ...(await orig<object>()), readPassportGroupStats: async () => [] }));
vi.mock('@/lib/ux-v1/p10/passport-data', () => ({ readTeamIdentity: async () => null }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => false }));

const profile = {
  id: 'u1', username: 'mina', display_name: 'Mina', avatar_url: null, avatar_bg: '#112233', avatar_text: '#ffffff', created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z', name_accent: 'default', name_font: 'default', avatar_kind: 'photo', avatar_ref: null, banned_at: null,
  bio: 'K-pop bio', bias: 'Jimin', ult_groups: ['bts'],
};
const membership = {
  user_id: 'u1', site_id: 'anime', joined_at: '2026-03-01T00:00:00Z', activated_at: '2026-03-02T00:00:00Z', banned_at: null, show_elsewhere: false,
  xp: 1280, quizzes_played: 40, blindtests_played: 7, games_played: 2, quizzes_created: 3, plays_received: 90, likes_received: 12,
  follower_count: 5, following_count: 1, daily_streak: 4, daily_streak_longest: 9, last_daily_date: '2026-10-20', bio: 'Watching since forever',
  header_url: null, profile_theme: 'default', pinned_badge_id: null, display_name_override: null, avatar_override: null, tag_text: 'Gojo', since_year: 2015,
};
const rows = (over: Partial<Rows> = {}): Rows => ({
  profiles: [profile], world_memberships: [membership],
  groups: [{ id: 1, name: 'Frieren', slug: 'frieren', site_id: 'anime' }, { id: 900, name: 'BTS', slug: 'bts', site_id: 'kpop' }],
  favourites: [{ user_id: 'u1', site_id: 'anime', slot: 'topic', rank: 0, entity_id: 'frieren' }],
  badge_definitions: [{ id: 'first_steps', name: 'First steps', description: 'Play', sort_order: 1, site_id: 'anime' }, { id: 'k_only', name: 'K-pop scholar', description: 'x', sort_order: 2, site_id: 'kpop' }],
  user_badges: [{ user_id: 'u1', badge_id: 'first_steps', earned_at: '2026-04-01T00:00:00Z' }],
  ...over,
});

async function onAnime() {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  return import('./world-data');
}

beforeEach(() => { state.user = null; state.rows = rows(); state.stamps = 1; });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('/u/{username} on anime', () => {
  it('404 when the username is unknown, when there is no membership on this site, when it is not activated, when it is banned', async () => {
    const { loadWorldProfile } = await onAnime();
    await expect(loadWorldProfile('nobody')).rejects.toThrow('NEXT_NOT_FOUND');
    state.rows = rows({ world_memberships: [{ ...membership, site_id: 'hub' }] });
    await expect(loadWorldProfile('mina')).rejects.toThrow('NEXT_NOT_FOUND');
    state.rows = rows({ world_memberships: [{ ...membership, activated_at: null }] });
    await expect(loadWorldProfile('mina')).rejects.toThrow('NEXT_NOT_FOUND');
    state.rows = rows({ world_memberships: [{ ...membership, banned_at: '2026-10-01T00:00:00Z' }] });
    await expect(loadWorldProfile('mina')).rejects.toThrow('NEXT_NOT_FOUND');
    state.rows = rows({ profiles: [{ ...profile, banned_at: '2026-10-01T00:00:00Z' }] });
    await expect(loadWorldProfile('mina')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('an activated member: the anime level, the oshi tag, the followed series, this site\'s badges, and not one kpop word', async () => {
    const { loadWorldProfile, worldProfileMetadata } = await onAnime();
    const props = await loadWorldProfile('mina');
    expect(props).toMatchObject({ mode: 'public', username: 'mina', displayName: 'Mina', bio: 'Watching since forever', bias: 'Gojo' });
    expect(props.level).toMatch(/^Lv \d+ · (New Viewer|Casual Watcher|Binge Watcher|Otaku|Ride-or-Die|Superfan|Legend)$/);
    expect(props.badges.map((b) => b.id)).toEqual(['first_steps']);
    expect(props.history).toBeNull();
    expect(props.stats.map((s) => s.label)).toEqual(['streak', 'series mastered', 'quizzes made', 'plays received']);
    expect(props.meta.flat().map((p) => p.text).join('')).toContain('Frieren since 2015');
    const meta = await worldProfileMetadata('mina');
    expect(meta.robots).toEqual({ index: false, follow: false });
    const { UxPassport } = await import('@/components/profile/ux-v1/passport');
    const html = renderToStaticMarkup(h(UxPassport, props));
    expect(html).not.toMatch(/k-?pop|jimin|bts|discord|stan/i);
    expect(html).toMatch(/class="ux-bias[^"]*"[^>]*><svg[\s\S]*?Gojo/);
  });

  it('a metadata call for a non-member is a 404 too', async () => {
    const { worldProfileMetadata } = await onAnime();
    state.rows = rows({ world_memberships: [] });
    await expect(worldProfileMetadata('mina')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('/me on anime', () => {
  it('a guest gets the invitation', async () => {
    const { loadWorldMe } = await onAnime();
    const me = await loadWorldMe();
    expect(me.kind).toBe('guest');
    const { UxPassportGuest } = await import('@/components/profile/ux-v1/passport-guest');
    const html = renderToStaticMarkup(h(UxPassportGuest, { words: (me as Extract<typeof me, { kind: 'guest' }>).words }));
    expect(html).toContain('Your OtakuQuiz passport');
    // 2026-10-28 (owner): bunnyverse.org signs in with Google and Discord, so Discord is named there as a sign-in method and nowhere else.
    expect(html).toContain('sign in with Google or Discord.');
    expect(html.replace('Google or Discord', '')).not.toMatch(/k-?pop|discord/i);
  });

  it('a user with no profile goes to /onboarding', async () => {
    const { loadWorldMe } = await onAnime();
    state.user = { id: 'u9' };
    await expect(loadWorldMe()).rejects.toThrow('NEXT_REDIRECT:/onboarding');
  });

  it('a banned user gets a 404', async () => {
    const { loadWorldMe } = await onAnime();
    state.user = { id: 'u1' };
    state.rows = rows({ world_memberships: [{ ...membership, banned_at: '2026-10-01T00:00:00Z' }] });
    await expect(loadWorldMe()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('a member sees the passport of this site, with the link to the whole passport when they have more than one stamp', async () => {
    const { loadWorldMe, wholePassportHref } = await onAnime();
    state.user = { id: 'u1' };
    const one = await loadWorldMe();
    expect(one).toMatchObject({ kind: 'passport', multiSite: false });
    state.stamps = 2;
    const two = await loadWorldMe();
    expect(two).toMatchObject({ kind: 'passport', multiSite: true });
    if (two.kind !== 'passport') return;
    expect(two.props).toMatchObject({ mode: 'personal', bias: 'Gojo' });
    expect(two.props.history).toEqual({ rows: [], quizzesPlayed: 40, blindtestsPlayed: 7 });
    expect(wholePassportHref()).toBe('/auth/passport/out?to=hub&next=%2Fpassport&via=a.pp');
    const { UxPassport } = await import('@/components/profile/ux-v1/passport');
    expect(renderToStaticMarkup(h(UxPassport, two.props))).not.toMatch(/k-?pop|jimin|bts|discord/i);
  });

  it('a member with no membership yet gets a neutral passport, never the kpop values', async () => {
    const { loadWorldMe } = await onAnime();
    state.user = { id: 'u1' };
    state.rows = rows({ world_memberships: [] });
    const me = await loadWorldMe();
    if (me.kind !== 'passport') throw new Error('expected a passport');
    expect(me.props.bias).toBeNull();
    expect(me.props.bio).toBe('');
    expect(me.props.xp.have).toBe('0');
  });
});

void fakeDb;
