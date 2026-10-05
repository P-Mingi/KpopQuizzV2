// V12 F5b: the leaderboard with editorial (team) accounts. Supabase is a recording
// fake: each test proves what a read touches. Flag off (NEXT_PUBLIC_UX_V12 unset):
// today's reads and output exactly, editorial_accounts never read.

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AroundData } from './data';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const fake = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, log: [] as string[], fresh: [] as unknown[] }));
function chain(table: string): unknown {
  const st = { select: '', limit: Infinity };
  const result = (): { data: unknown[]; error: null; status: number } => {
    const rows = fake.rows[`${table}|${st.select}`] ?? fake.rows[table] ?? [];
    return { data: rows.slice(0, st.limit), error: null, status: 200 };
  };
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      return (...args: unknown[]) => {
        if (prop === 'select') st.select = String(args[0]);
        if (prop === 'limit') { st.limit = Number(args[0]); fake.log.push(`${table}.limit(${String(args[0])})`); }
        return proxy;
      };
    },
  });
  return proxy;
}
const client = {
  from: (t: string) => { fake.log.push(t); return chain(t); },
  rpc: (fn: string, args: unknown) => { fake.log.push(`rpc:${fn}:${JSON.stringify(args)}`); return chain(`rpc:${fn}`); },
};
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));
vi.mock('@/lib/db/queries/quizzes', () => ({ getNewQuizzes: async () => fake.fresh }));

const uid = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
// 25 players by XP; the 9 team accounts are players 1, 2, 4, 5, 7, 8, 10, 11, 13.
const TEAM_IX = [1, 2, 4, 5, 7, 8, 10, 11, 13];
const players = Array.from({ length: 25 }, (_, k) => {
  const i = k + 1;
  return { id: uid(i), username: TEAM_IX.includes(i) ? `team${i}` : `fan${i}`, avatar_url: null, avatar_kind: null, avatar_ref: null, xp: 100_000 - i * 1000, ult_groups: null, name_accent: null, name_font: null, bias: null };
});

async function load(v12: boolean): Promise<typeof import('./data')> {
  vi.resetModules();
  fake.log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = {
    editorial_accounts: TEAM_IX.map((i) => ({ user_id: uid(i), display_name: `Team ${i}`, beat: 'news', active: true })),
    profiles: players,
    'profiles|username': TEAM_IX.map((i) => ({ username: `team${i}` })),
    groups: [],
    'rpc:get_fandom_war_map': [{ name: 'ATEEZ', slug: 'ateez', logo_url: null, display_color: '#000', plays_week: 9, fans_week: 2, plays_prev: 0 }],
    'rpc:get_fandom_war_map_v12': [{ name: 'BTS', slug: 'bts', logo_url: null, display_color: '#000', plays_week: 4, fans_week: 2, plays_prev: 0 }],
  };
  const now = new Date().toISOString();
  fake.fresh = ['team4', 'fan3', 'fan6'].map((by, i) => ({ id: `q${i}`, title: `Quiz ${i}`, slug: `quiz-${i}`, creator_username: by, play_count: 10, group_name: 'BTS', created_at: now }));
  return import('./data');
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('Players board', () => {
  it('read size: board + max(margin, team size)', async () => {
    const { playersReadSize } = await load(false);
    expect([playersReadSize(0), playersReadSize(3), playersReadSize(9)]).toEqual([15, 15, 19]);
  });

  it('flag off: today read (15 rows), team accounts listed as today, no team read', async () => {
    const { readPlayers } = await load(false);
    const rows = await readPlayers();
    expect(fake.log).toContain('profiles.limit(15)');
    expect(fake.log).not.toContain('editorial_accounts');
    expect(rows.map((r) => r.username).slice(0, 2)).toEqual(['team1', 'team2']);
    expect(rows).toHaveLength(10);
  });

  it('flag on, 9 team accounts in the top 13: still 10 rows, none of them', async () => {
    const { readPlayers } = await load(true);
    const rows = await readPlayers();
    expect(fake.log).toContain('profiles.limit(19)');
    expect(rows).toHaveLength(10);
    expect(rows.some((r) => r.username.startsWith('team'))).toBe(false);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('Fresh quizzes panel', () => {
  it('flag off: no byTeam key, no team read', async () => {
    const { readFresh } = await load(false);
    const rows = await readFresh();
    expect(rows.every((r) => !('byTeam' in r))).toBe(true);
    expect(fake.log).toEqual([]);
  });

  it('flag on: the team author is marked and renders the Team badge', async () => {
    const { readFresh } = await load(true);
    const rows = await readFresh();
    expect(rows.map((r) => r.byTeam ?? false)).toEqual([true, false, false]);
    const { AroundCommunity } = await import('@/components/leaderboard/ux-v1/around');
    const data: AroundData = { today: null, qotd: null, happening: [], fresh: rows, comments: [], badges: [] };
    const out = renderToStaticMarkup(h(AroundCommunity, { data }));
    expect(out).toMatch(/by team4 <span class="ux-teamtag"[^>]*>Team<\/span> · 10 plays/);
    expect(out).toMatch(/by fan3 · 10 plays/);
    expect(out).not.toMatch(/Lv \d/);
  });
});

describe('Around feeds: minimums apply after the team filter', () => {
  const person = (u: string): AroundData['comments'][number]['person'] => ({ username: u, href: `/u/${u}`, avatar: { src: null, bg: null, fg: null }, accent: null, font: null, bias: null });
  const comments = ['a', 'b', 'team4', 'c'].map((u, i) => ({ id: `c${i}`, person: person(u), quizTitle: 'Q', quizHref: '/q/q', content: 'x', score: null, ago: '1h' }));
  const badges = ['a', 'b', 'team4', 'c'].map((u, i) => ({ id: `b${i}`, badgeId: `x${i}`, badgeName: 'B', person: person(u), ago: '1h' }));

  it('no team: unchanged; team: comments under 4 hide, badges keep 3', async () => {
    const { feedsWithoutTeam } = await load(false);
    const f = { happening: [], comments, badges };
    expect(feedsWithoutTeam(f, new Set())).toBe(f);
    const out = feedsWithoutTeam(f, new Set(['team4']));
    expect(out.comments).toEqual([]);
    expect(out.badges.map((b) => b.person.username)).toEqual(['a', 'b', 'c']);
  });
});

describe('Fandom war board', () => {
  it('flag off: get_fandom_war_map; flag on: the v12 function', async () => {
    let d = await load(false);
    expect((await d.readWarBoard()).map((r) => r.slug)).toEqual(['ateez']);
    expect(fake.log).toContain('rpc:get_fandom_war_map:{"p_limit":91}');
    expect(fake.log).not.toContain('editorial_accounts');
    d = await load(true);
    expect((await d.readWarBoard()).map((r) => r.slug)).toEqual(['bts']);
    expect(fake.log).toContain('rpc:get_fandom_war_map_v12:{"p_limit":91}');
  });
});
