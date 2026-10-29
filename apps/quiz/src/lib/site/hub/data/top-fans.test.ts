import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));

import { getLevelInfo } from '@/lib/constants';

import { fakeDb, ORIGINS } from './test-support';
import { playXp, rankFans, readTopFans, weekXpFromPlays, weekXpFromSnapshots } from './top-fans';

import type { Row } from './test-support';
import type { ProfileInfo, Stamp } from './top-fans';

const NOW = new Date('2026-10-25T12:00:00Z');
const U = (n: number): string => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

const stamp = (n: number, site: 'kpop' | 'anime', xp: number | null = null): Stamp => ({ user_id: U(n), site_id: site, xp });
const profile = (n: number, username: string | null, xp = 0, banned: string | null = null): ProfileInfo => ({ id: U(n), username, xp, banned_at: banned });

describe('XP of a play', () => {
  it('is what the play route awards', () => {
    expect(playXp(5, 10)).toBe(10);
    expect(playXp(7, 10)).toBe(15);
    expect(playXp(10, 10)).toBe(30);
    expect(playXp(0, 0)).toBe(10);
  });
});

describe('rankFans', () => {
  const base = {
    profiles: new Map([[U(1), profile(1, 'sunbae', 400)], [U(2), profile(2, 'tteok', 900)], [U(3), profile(3, 'kenjiro', 0)], [U(4), profile(4, 'banned', 100, '2026-10-01T00:00:00Z')], [U(5), profile(5, null, 100)], [U(6), profile(6, 'teamacct', 100)]]),
    levelPublic: new Set([U(1), U(3), U(6)]),
    teamIds: new Set([U(6)]),
    origins: ORIGINS,
  };

  it('ranks by the XP of the week, ties by handle, and counts only public stamps', () => {
    const stamps = [stamp(1, 'kpop'), stamp(1, 'anime', 250), stamp(2, 'kpop'), stamp(3, 'anime', 100)];
    const weekXp = new Map([[`${U(1)}:kpop`, 20], [`${U(1)}:anime`, 25], [`${U(2)}:kpop`, 45], [`${U(3)}:anime`, 45]]);
    const out = rankFans({ ...base, stamps, weekXp });
    expect(out.map((f) => f.handle)).toEqual(['kenjiro', 'sunbae', 'tteok']);
    expect(out.map((f) => f.rank)).toEqual([1, 2, 3]);
    expect(out[0]).toMatchObject({ handle: 'kenjiro', initial: 'K', kpop: false, anime: true, href: 'https://hub.example/u/kenjiro' });
    expect(out[1]).toMatchObject({ handle: 'sunbae', kpop: true, anime: true });
  });

  it('prints the level only for a fan who made it public, from the XP of the public stamps', () => {
    const out = rankFans({ ...base, stamps: [stamp(1, 'kpop'), stamp(1, 'anime', 250), stamp(2, 'kpop')], weekXp: new Map([[`${U(1)}:kpop`, 10], [`${U(2)}:kpop`, 5]]) });
    const sunbae = out.find((f) => f.handle === 'sunbae')!;
    const tteok = out.find((f) => f.handle === 'tteok')!;
    expect(sunbae.level).toBe(getLevelInfo(400 + 250, 'hub').level);
    expect(tteok.level).toBeNull();
  });

  it('leaves out Team accounts, banned fans, fans without a username and fans without XP this week', () => {
    const stamps = [stamp(6, 'kpop'), stamp(4, 'kpop'), stamp(5, 'kpop'), stamp(3, 'kpop'), stamp(1, 'kpop')];
    const weekXp = new Map([[`${U(6)}:kpop`, 999], [`${U(4)}:kpop`, 99], [`${U(5)}:kpop`, 99], [`${U(3)}:kpop`, 0], [`${U(1)}:kpop`, 1]]);
    expect(rankFans({ ...base, stamps, weekXp }).map((f) => f.handle)).toEqual(['sunbae']);
  });

  it('with a site (home v3): that site\'s board only, ranked by its XP of the week, with the level of that site', () => {
    const stamps = [stamp(1, 'kpop'), stamp(1, 'anime', 250), stamp(2, 'kpop'), stamp(3, 'anime', 100)];
    const weekXp = new Map([[`${U(1)}:kpop`, 20], [`${U(1)}:anime`, 25], [`${U(2)}:kpop`, 45], [`${U(3)}:anime`, 40]]);
    // both sites together, sunbae leads (20 + 25 = 45, tie with tteok broken by the handle)
    expect(rankFans({ ...base, stamps, weekXp }).map((f) => f.handle)).toEqual(['sunbae', 'tteok', 'kenjiro']);
    const kpop = rankFans({ ...base, stamps, weekXp }, 'kpop');
    // on the K-pop board only the K-pop XP of the week counts: tteok 45, sunbae 20; kenjiro has no K-pop stamp
    expect(kpop.map((f) => [f.handle, f.rank])).toEqual([['tteok', 1], ['sunbae', 2]]);
    expect(kpop.every((f) => f.kpop && !f.anime)).toBe(true);
    // sunbae made the level public: on the K-pop board it is the level of the K-pop XP (the profile), not the passport's
    expect(kpop.find((f) => f.handle === 'sunbae')!.level).toBe(getLevelInfo(400, 'kpop').level);
    expect(kpop.find((f) => f.handle === 'tteok')!.level).toBeNull();
    const anime = rankFans({ ...base, stamps, weekXp }, 'anime');
    expect(anime.map((f) => [f.handle, f.rank])).toEqual([['kenjiro', 1], ['sunbae', 2]]);
    // on the anime board: the XP of the membership, and the anime ladder
    expect(anime.find((f) => f.handle === 'sunbae')!.level).toBe(getLevelInfo(250, 'anime').level);
    expect(anime.find((f) => f.handle === 'kenjiro')!.level).toBe(getLevelInfo(100, 'anime').level);
    expect(anime.every((f) => f.anime && !f.kpop)).toBe(true);
    // a fan with no XP this week on that site is not on its board
    expect(rankFans({ ...base, stamps, weekXp: new Map([[`${U(1)}:anime`, 5]]) }, 'kpop')).toEqual([]);
  });

  it('keeps five fans at most', () => {
    const profiles = new Map(Array.from({ length: 8 }, (_, i) => [U(i + 10), profile(i + 10, `fan${i}`, 10)] as const));
    const stamps = Array.from({ length: 8 }, (_, i) => stamp(i + 10, 'kpop'));
    const weekXp = new Map(Array.from({ length: 8 }, (_, i) => [`${U(i + 10)}:kpop`, 10 + i] as const));
    const out = rankFans({ stamps, profiles, levelPublic: new Set(), teamIds: new Set(), weekXp, origins: ORIGINS });
    expect(out).toHaveLength(5);
    expect(out.map((f) => f.handle)).toEqual(['fan7', 'fan6', 'fan5', 'fan4', 'fan3']);
  });
});

describe('the XP of the week', () => {
  it('is the XP now minus the oldest snapshot of the last 7 days', async () => {
    const db = fakeDb({
      xp_daily_snapshots: [
        { day: '2026-10-19', user_id: U(1), site_id: 'kpop', xp: 300 },
        { day: '2026-10-19', user_id: U(1), site_id: 'anime', xp: 40 },
        { day: '2026-10-24', user_id: U(1), site_id: 'kpop', xp: 390 },
        { day: '2026-10-12', user_id: U(1), site_id: 'kpop', xp: 5 },
      ],
    });
    const stamps = [stamp(1, 'kpop'), stamp(1, 'anime', 100), stamp(2, 'anime', 60)];
    const profiles = new Map([[U(1), profile(1, 'a', 400)]]);
    const out = await weekXpFromSnapshots(db as never, stamps, profiles, NOW);
    expect(out?.get(`${U(1)}:kpop`)).toBe(100);
    expect(out?.get(`${U(1)}:anime`)).toBe(60);
    // a fan with no snapshot row had no XP at the baseline: everything is this week's
    expect(out?.get(`${U(2)}:anime`)).toBe(60);
  });

  it('is unavailable without the table, without a snapshot older than today, or on a database error', async () => {
    const stamps = [stamp(1, 'kpop')];
    const profiles = new Map([[U(1), profile(1, 'a', 400)]]);
    expect(await weekXpFromSnapshots(fakeDb({}) as never, stamps, profiles, NOW)).toBeNull();
    expect(await weekXpFromSnapshots(fakeDb({ xp_daily_snapshots: [] }) as never, stamps, profiles, NOW)).toBeNull();
    expect(await weekXpFromSnapshots(fakeDb({ xp_daily_snapshots: [{ day: '2026-10-25', user_id: U(1), site_id: 'kpop', xp: 1 }] }) as never, stamps, profiles, NOW)).toBeNull();
    expect(await weekXpFromSnapshots(fakeDb({ xp_daily_snapshots: [] }, { failing: { xp_daily_snapshots: 'down' } }) as never, stamps, profiles, NOW)).toBeNull();
  });

  it('is estimated from the first play of each quiz of the week, on the site of the stamp', async () => {
    const play = (id: string, user: number, quiz: string, score: number, site: string, at = '2026-10-24T10:00:00Z'): Row =>
      ({ id, player_id: U(user), quiz_id: quiz, score, total_questions: 10, created_at: at, quizzes: { site_id: site } });
    const db = fakeDb({
      plays: [
        play('1', 1, 'q1', 10, 'kpop'),
        play('2', 1, 'q1', 10, 'kpop', '2026-10-25T10:00:00Z'),
        play('3', 1, 'q2', 7, 'kpop'),
        play('4', 1, 'q3', 3, 'anime'),
        play('5', 1, 'q4', 10, 'anime', '2026-10-10T10:00:00Z'),
        play('6', 2, 'q1', 10, 'anime'),
        play('7', 3, 'q1', 10, 'kpop'),
      ],
    });
    const out = await weekXpFromPlays(db as never, [stamp(1, 'kpop'), stamp(2, 'kpop')], NOW);
    // user 1 on kpop: q1 once (30) + q2 (15); the anime plays do not count, there is no public anime stamp
    expect(out.get(`${U(1)}:kpop`)).toBe(45);
    expect(out.get(`${U(1)}:anime`)).toBeUndefined();
    // user 2 played an anime quiz but has only a kpop stamp: nothing
    expect(out.get(`${U(2)}:kpop`)).toBeUndefined();
    // user 3 has no public stamp: never read
    expect(out.get(`${U(3)}:kpop`)).toBeUndefined();
  });
});

describe('readTopFans', () => {
  const membership = (n: number, site: string, over: Row = {}): Row => ({ user_id: U(n), site_id: site, xp: 0, show_elsewhere: true, activated_at: '2026-10-01T00:00:00Z', banned_at: null, ...over });
  const tables = (): Record<string, Row[]> => ({
    editorial_accounts: [{ user_id: U(9) }],
    world_memberships: [
      membership(1, 'kpop'), membership(1, 'anime', { xp: 120 }),
      membership(2, 'kpop', { show_elsewhere: false }),
      membership(3, 'anime', { xp: 70 }),
      membership(4, 'kpop', { activated_at: null }),
      membership(5, 'anime', { banned_at: '2026-10-02T00:00:00Z' }),
      membership(9, 'anime', { xp: 5000 }),
      membership(6, 'hub'),
    ],
    profiles: [
      { id: U(1), username: 'mira', xp: 380, banned_at: null }, { id: U(2), username: 'private', xp: 999, banned_at: null },
      { id: U(3), username: 'kenji', xp: 0, banned_at: null }, { id: U(9), username: 'oq_creator_01', xp: 0, banned_at: null },
    ],
    passport_prefs: [{ user_id: U(1), show_passport_level: true }, { user_id: U(3), show_passport_level: false }],
    plays: [
      ...[1, 2, 3, 9].map((n) => ({ id: `p${n}`, player_id: U(n), quiz_id: `q${n}`, score: 10, total_questions: 10, created_at: '2026-10-24T10:00:00Z', quizzes: { site_id: n === 1 || n === 2 ? 'kpop' : 'anime' } })),
    ],
  });

  it('lists only fans with a public stamp, no Team account, no private profile', async () => {
    const out = await readTopFans(ORIGINS, NOW, fakeDb(tables()) as never);
    expect(out?.basis).toBe('plays');
    expect(out?.fans.map((f) => f.handle)).toEqual(['kenji', 'mira']);
    const json = JSON.stringify(out);
    expect(json).not.toContain('private');
    expect(json).not.toContain('oq_creator_01');
    expect(out?.fans.find((f) => f.handle === 'mira')?.level).not.toBeNull();
    expect(out?.fans.find((f) => f.handle === 'kenji')?.level).toBeNull();
  });

  it('uses the snapshots when the table has them', async () => {
    const t = tables();
    t.xp_daily_snapshots = [{ day: '2026-10-20', user_id: U(1), site_id: 'kpop', xp: 350 }, { day: '2026-10-20', user_id: U(3), site_id: 'anime', xp: 10 }];
    const out = await readTopFans(ORIGINS, NOW, fakeDb(t) as never);
    expect(out?.basis).toBe('snapshots');
    // mira: 380 - 350 = 30 on kpop, plus 120 on anime with no baseline row = 150; kenji: 70 - 10 = 60
    expect(out?.fans.map((f) => f.handle)).toEqual(['mira', 'kenji']);
  });

  it('fails closed: no Team list means no board, and a database error is an error', async () => {
    const t = tables();
    await expect(readTopFans(ORIGINS, NOW, fakeDb(t, { failing: { editorial_accounts: 'permission denied' } }) as never)).rejects.toThrow('permission denied');
    await expect(readTopFans(ORIGINS, NOW, fakeDb(t, { failing: { world_memberships: 'down' } }) as never)).rejects.toThrow('down');
  });

  it('is null when nobody made a stamp public', async () => {
    const t = tables();
    t.world_memberships = t.world_memberships!.map((m) => ({ ...m, show_elsewhere: false }));
    expect(await readTopFans(ORIGINS, NOW, fakeDb(t) as never)).toBeNull();
  });
});
