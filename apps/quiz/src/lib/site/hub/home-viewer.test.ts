import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLevelInfo } from '@/lib/constants';

import { buildHomeViewer, loadHomeSession, loadHomeViewer } from './home-viewer';

// Lot H2c: the signed-in fan of the home: username, level and sites from the passport, progress from the xp of the passport, and the
// daily streak of each site (live only while its last day is today or yesterday, UTC), from the account itself. Supabase is a fake.

const fake = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: { data: null as unknown, error: null as unknown },
  memberships: { data: [] as unknown, error: null as unknown },
  throwOn: null as null | 'client' | 'auth',
  seen: [] as string[],
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => {
    if (fake.throwOn === 'client') throw new Error('unreachable');
    return {
      auth: { getUser: async () => { if (fake.throwOn === 'auth') throw new Error('fetch failed'); return { data: { user: fake.user }, error: null }; } },
      from: (table: string) => {
        fake.seen.push(table);
        const result = table === 'profiles' ? fake.profile : fake.memberships;
        const q: Record<string, unknown> = {
          select: () => q,
          eq: () => q,
          maybeSingle: () => Promise.resolve(result),
          then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
        };
        return q;
      },
    };
  },
}));

const NOW = new Date('2026-10-25T12:00:00Z');
const kpopRow = { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: null };
const animeRow = (extra: Record<string, unknown> = {}) => ({ site_id: 'anime', xp: 300, activated_at: '2026-10-01T00:00:00Z', banned_at: null, daily_streak: 2, last_daily_date: '2026-10-25', ...extra });
const profile = (extra: Record<string, unknown> = {}) => ({ username: 'mina', xp: 1200, daily_streak: 6, last_daily_date: '2026-10-24', ...extra });

describe('buildHomeViewer', () => {
  it('reads the username, the level and the sites joined from the passport and the progress from the xp of every site', () => {
    const v = buildHomeViewer(profile(), [kpopRow, animeRow()], NOW)!;
    const info = getLevelInfo(1200 + 300, 'hub');
    expect(v).toMatchObject({ username: 'mina', level: info.level, sitesJoined: 2, progress: info.progress });
  });

  it('takes the streak of KpopQuiz from the profile and the one of OtakuQuiz from its membership', () => {
    expect(buildHomeViewer(profile(), [kpopRow, animeRow()], NOW)!.streaks).toEqual({ kpop: 6, anime: 2 });
  });

  it('keeps a streak that ended yesterday and drops one that ended earlier (the passports show it the same way)', () => {
    expect(buildHomeViewer(profile({ last_daily_date: '2026-10-23' }), [kpopRow, animeRow({ last_daily_date: '2026-10-24' })], NOW)!.streaks).toEqual({ kpop: 0, anime: 2 });
    expect(buildHomeViewer(profile({ last_daily_date: null }), [kpopRow], NOW)!.streaks).toEqual({ kpop: 0, anime: 0 });
  });

  it('has no OtakuQuiz streak for a fan who has not joined it, or who is banned there', () => {
    expect(buildHomeViewer(profile(), [kpopRow], NOW)!.streaks.anime).toBe(0);
    expect(buildHomeViewer(profile(), [kpopRow, animeRow({ banned_at: '2026-10-20T00:00:00Z' })], NOW)!.streaks.anime).toBe(0);
    expect(buildHomeViewer(profile(), [kpopRow, animeRow({ activated_at: null })], NOW)!.streaks.anime).toBe(0);
  });

  it('is null without a username', () => {
    expect(buildHomeViewer(profile({ username: null }), [kpopRow], NOW)).toBeNull();
    expect(buildHomeViewer(null, [], NOW)).toBeNull();
  });

  it('shows a new fan at the start of the first level', () => {
    const v = buildHomeViewer(profile({ xp: 0, daily_streak: 0 }), [], NOW)!;
    expect(v).toMatchObject({ level: 1, progress: 0, sitesJoined: 0, streaks: { kpop: 0, anime: 0 } });
  });
});

describe('loadHomeSession', () => {
  beforeEach(() => {
    const today = new Date().toISOString().slice(0, 10);
    fake.user = { id: 'u-1' };
    fake.profile = { data: profile({ last_daily_date: today }), error: null };
    fake.memberships = { data: [kpopRow, animeRow({ last_daily_date: today })], error: null };
    fake.throwOn = null;
    fake.seen = [];
  });

  it('gives the viewer and the account id, read as the fan', async () => {
    const s = await loadHomeSession();
    expect(s!.userId).toBe('u-1');
    expect(s!.viewer).toMatchObject({ username: 'mina', sitesJoined: 2, streaks: { kpop: 6, anime: 2 } });
    expect(fake.seen.sort()).toEqual(['profiles', 'world_memberships']);
    expect((await loadHomeViewer())!.username).toBe('mina');
  });

  it('reads as signed out when nobody is signed in, and on every kind of error', async () => {
    fake.user = null;
    expect(await loadHomeSession()).toBeNull();
    expect(await loadHomeViewer()).toBeNull();
    fake.user = { id: 'u-1' };
    fake.throwOn = 'client';
    expect(await loadHomeSession()).toBeNull();
    fake.throwOn = 'auth';
    expect(await loadHomeSession()).toBeNull();
    fake.throwOn = null;
    fake.profile = { data: null, error: { message: 'rls' } };
    expect(await loadHomeSession()).toBeNull();
    fake.profile = { data: profile(), error: null };
    fake.memberships = { data: null, error: { message: 'no such table' } };
    expect(await loadHomeSession()).toBeNull();
  });
});
