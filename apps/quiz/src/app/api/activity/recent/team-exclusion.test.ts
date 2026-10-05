// V12 F2b (G9 R5a R5b R5e R5f): editorial accounts leave the legacy boards, the
// ticker and activity reads, the online count, the group mastery count and the
// legacy search. Supabase is a recording fake that also applies the `.not(col,
// 'in', ...)` and `.or(col.is.null,col.not.in.(...))` filters, so "the row is
// gone" is proved through the real query chain. The rule: with NEXT_PUBLIC_UX_V12
// unset, editorial_accounts is never read, no filter carries a team id and the
// output equals the input rows.

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

type Row = Record<string, unknown>;
interface Entry { table: string; calls: Array<[string, unknown[]]> }
const fake = vi.hoisted(() => ({ rows: {} as Record<string, Row[]>, log: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }> }));

function chain(table: string): unknown {
  const entry: Entry = { table, calls: [] };
  fake.log.push(entry);
  let rows = [...(fake.rows[table] ?? [])];
  const out = (): { data: Row[]; error: null; count: number; status: number } => ({ data: rows, error: null, count: rows.length, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(out()).then(res, rej);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ ...out(), data: rows[0] ?? null });
      return (...args: unknown[]) => {
        entry.calls.push([String(prop), args]);
        if (prop === 'not' && args[1] === 'in') {
          const ids = String(args[2]).slice(1, -1).split(',');
          rows = rows.filter((r) => !ids.includes(String(r[String(args[0])])));
        }
        const m = prop === 'or' ? /^(\w+)\.is\.null,\1\.not\.in\.\((.*)\)$/.exec(String(args[0])) : null;
        if (m) { const col = m[1] ?? ''; const ids = (m[2] ?? '').split(','); rows = rows.filter((r) => r[col] == null || !ids.includes(String(r[col]))); }
        return proxy;
      };
    },
  });
  return proxy;
}
const client = { from: (t: string) => chain(t), rpc: (fn: string, args: unknown) => { const c = chain(`rpc:${fn}`) as { args: (...a: unknown[]) => unknown }; c.args(args); return c; } };
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));

const MINA = '11111111-1111-4111-8111-111111111111';
const FAN = '22222222-2222-4222-8222-222222222222';

async function flags(v12: boolean, rows: Record<string, Row[]>): Promise<void> {
  vi.resetModules();
  fake.log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = { ...rows, editorial_accounts: [{ user_id: MINA, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }] };
}

/** Flag off: editorial_accounts never read, no `.not` and no filter that names a team id. */
function expectNoTeamRead(): void {
  expect(fake.log.map((e) => e.table)).not.toContain('editorial_accounts');
  const filters = fake.log.flatMap((e) => e.calls).filter(([m]) => m === 'not' || m === 'or');
  expect(filters.filter(([m]) => m === 'not')).toEqual([]);
  expect(JSON.stringify(filters)).not.toContain(MINA);
}

afterEach(() => { vi.unstubAllEnvs(); });

const prof = (id: string, username: string): Row => ({ id, username, display_name: null, avatar_url: null, avatar_bg: '#000', avatar_text: '#fff', xp: 10, follower_count: 1, total_quizzes_created: 1, total_plays_received: 5, name_accent: null, name_font: null, pinned_badge_id: null, avatar_kind: null, avatar_ref: null, bias: null });
const PROFILES = [prof(MINA, 'mina'), prof(FAN, 'fan')];

describe('helper teamIdsToExclude', () => {
  it('flag off: null and no read', async () => {
    await flags(false, {});
    const { teamIdsToExclude } = await import('@/lib/db/queries/profiles');
    expect(await teamIdsToExclude()).toBeNull();
    expect(fake.log).toHaveLength(0);
  });
  it('flag on: the active team ids', async () => {
    await flags(true, {});
    const { teamIdsToExclude } = await import('@/lib/db/queries/profiles');
    expect(await teamIdsToExclude()).toEqual([MINA]);
  });
});

describe('R5a legacy boards (profiles.ts)', () => {
  for (const name of ['getTopPlayersByXp', 'getTopCreatorsAllTime'] as const) {
    it(`${name}: flag off output equals input, no team read`, async () => {
      await flags(false, { profiles: PROFILES });
      const mod = await import('@/lib/db/queries/profiles');
      expect(await mod[name](10)).toEqual(PROFILES);
      expectNoTeamRead();
    });
    it(`${name}: flag on drops the team row`, async () => {
      await flags(true, { profiles: PROFILES });
      const mod = await import('@/lib/db/queries/profiles');
      expect((await mod[name](10)).map((p) => p.username)).toEqual(['fan']);
    });
  }
  it('getTopCreatorsThisWeek: off keeps both, on drops the team creator', async () => {
    const quizzes = [MINA, FAN].map((id, i) => ({ creator_id: id, play_count: 9 - i, profiles: PROFILES[i] }));
    await flags(false, { quizzes });
    expect((await (await import('@/lib/db/queries/profiles')).getTopCreatorsThisWeek(10)).map((c) => c.username)).toEqual(['mina', 'fan']);
    expectNoTeamRead();
    await flags(true, { quizzes });
    expect((await (await import('@/lib/db/queries/profiles')).getTopCreatorsThisWeek(10)).map((c) => c.username)).toEqual(['fan']);
  });
});

const ago = (min: number): string => new Date(Date.now() - min * 60_000).toISOString();
const ev = (id: number, user_id: string | null): Row => ({ id, event_type: 'quiz_completed', user_id, display_name: `p${id}`, group_slug: null, payload: { score: 3, total: 5 }, created_at: ago(id) });

describe('R5a / R5b community reads (community.ts)', () => {
  const cases: Array<{ name: string; rows: Record<string, Row[]>; run: (m: typeof import('@/lib/db/queries/community')) => Promise<unknown[]>; who: (x: never) => unknown }> = [
    { name: 'getRisingCreators', rows: { 'rpc:get_rising_creators': [{ followed_id: MINA, new_followers: 9 }, { followed_id: FAN, new_followers: 3 }], profiles: PROFILES },
      run: (m) => m.getRisingCreators(8), who: (x: { person: { username: string } }) => x.person.username as never },
    { name: 'getActiveFansByGroup', rows: { groups: [{ id: 1 }], player_group_mastery: [{ player_id: MINA, songs_played: 9, songs_correct: 9 }, { player_id: FAN, songs_played: 5, songs_correct: 4 }], profiles: PROFILES },
      run: (m) => m.getActiveFansByGroup('bts', 8), who: (x: { person: { username: string } }) => x.person.username as never },
    { name: 'getQuizHallOfFame', rows: { plays: [{ score: 9, total_questions: 10, time_taken_seconds: 30, player_id: MINA, profiles: PROFILES[0] }, { score: 8, total_questions: 10, time_taken_seconds: 40, player_id: FAN, profiles: PROFILES[1] }] },
      run: (m) => m.getQuizHallOfFame('q1', 10), who: (x: { person: { username: string } }) => x.person.username as never },
    { name: 'getHappeningNow', rows: { activity_events: [ev(1, MINA), ev(2, FAN)], groups: [], profiles: PROFILES, activity_cheers: [] },
      run: async (m) => (await m.getHappeningNow(12)).events, who: (x: { displayName: string }) => x.displayName as never },
    { name: 'getLatestBadgeEarns', rows: { user_badges: [{ badge_id: 'b1', user_id: MINA, earned_at: ago(1), badge_definitions: { id: 'b1', name: 'B1', icon: null }, profiles: PROFILES[0] }, { badge_id: 'b2', user_id: FAN, earned_at: ago(2), badge_definitions: { id: 'b2', name: 'B2', icon: null }, profiles: PROFILES[1] }] },
      run: (m) => m.getLatestBadgeEarns(6), who: (x: { person: { username: string } }) => x.person.username as never },
    { name: 'getCommunityComments', rows: { quiz_comments: [MINA, FAN].map((u, i) => ({ id: `c${i}`, quiz_id: 'q', user_id: u, content: 'nice quiz', score: 1, total: 2, created_at: ago(i), quizzes: { title: 'T', slug: 't' } })), profiles: PROFILES },
      run: (m) => m.getCommunityComments(8), who: (x: { person: { username: string } }) => x.person.username as never },
  ];
  for (const c of cases) {
    it(`${c.name}: flag off keeps every row with no team read; flag on drops the team row`, async () => {
      await flags(false, c.rows);
      const off = (await c.run(await import('@/lib/db/queries/community'))).map((x) => c.who(x as never));
      expect(off).toHaveLength(2);
      expectNoTeamRead();
      await flags(true, c.rows);
      const on = (await c.run(await import('@/lib/db/queries/community'))).map((x) => c.who(x as never));
      expect(on).toEqual([off[1]]);
    });
  }
  it('getHappeningNow: the 48h count leaves the team out only with the flag on', async () => {
    const rows = { activity_events: [ev(1, MINA), ev(2, FAN), ev(3, null)], groups: [], profiles: PROFILES, activity_cheers: [] };
    await flags(false, rows);
    expect((await (await import('@/lib/db/queries/community')).getHappeningNow(12)).recentCount).toBe(3);
    await flags(true, rows);
    expect((await (await import('@/lib/db/queries/community')).getHappeningNow(12)).recentCount).toBe(2);
  });
});

describe('R5e group mastery count (group-hub.ts getGroupMasteryAgg)', () => {
  it('flag off counts the team mastery row with no team read; flag on leaves it out', async () => {
    const rows = { player_group_mastery: [{ player_id: MINA, songs_played: 40, songs_correct: 40 }, { player_id: FAN, songs_played: 40, songs_correct: 36 }], groups: [], profiles: PROFILES };
    await flags(false, rows);
    const off = await (await import('@/lib/db/queries/group-hub')).getGroupFanKnowledge(1, 'bts');
    expect([off.masteredCount, off.trackedPlays]).toEqual([2, 80]);
    expectNoTeamRead();
    await flags(true, rows);
    const on = await (await import('@/lib/db/queries/group-hub')).getGroupFanKnowledge(1, 'bts');
    expect([on.masteredCount, on.trackedPlays]).toEqual([1, 40]);
  });
});

describe('R5b ticker, R5b online count, R5f legacy search (API routes)', () => {
  it('/api/activity/recent: flag off same events with no team read; flag on drops the team events', async () => {
    const rows = { activity_events: Array.from({ length: 10 }, (_, i) => ev(i + 1, i === 0 ? MINA : FAN)), groups: [] };
    await flags(false, rows);
    const off = await (await (await import('@/app/api/activity/recent/route')).GET()).json() as { events: Array<{ id: number }> };
    expect(off.events.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expectNoTeamRead();
    await flags(true, rows);
    const on = await (await (await import('@/app/api/activity/recent/route')).GET()).json() as { events: Array<{ id: number }> };
    expect(on.events.map((e) => e.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('/api/stats/live: flag off counts the team play with no team read; flag on leaves it out of online', async () => {
    const rows = { plays: [{ player_id: MINA }, { player_id: FAN }, { player_id: null }] };
    await flags(false, rows);
    expect(await (await (await import('@/app/api/stats/live/route')).GET()).json()).toEqual({ online: 3, todayPlays: 3, totalPlays: 3 });
    expectNoTeamRead();
    await flags(true, rows);
    expect(await (await (await import('@/app/api/stats/live/route')).GET()).json()).toEqual({ online: 2, todayPlays: 3, totalPlays: 3 });
  });

  it('/api/search: flag off lists the team account with no team read; flag on leaves it out of creators and people', async () => {
    const req = (): never => new Request('http://localhost/api/search?q=in') as never;
    await flags(false, { profiles: PROFILES, quizzes: [], groups: [] });
    const off = await (await (await import('@/app/api/search/route')).GET(req())).json() as { creators: Row[]; people: Row[] };
    expect([off.creators.map((p) => p.username), off.people.map((p) => p.username)]).toEqual([['mina', 'fan'], ['mina', 'fan']]);
    expect(off.creators).toEqual(PROFILES);
    expectNoTeamRead();
    await flags(true, { profiles: PROFILES, quizzes: [], groups: [] });
    const on = await (await (await import('@/app/api/search/route')).GET(req())).json() as { creators: Row[]; people: Row[] };
    expect([on.creators.map((p) => p.username), on.people.map((p) => p.username)]).toEqual([['fan'], ['fan']]);
  });
});
