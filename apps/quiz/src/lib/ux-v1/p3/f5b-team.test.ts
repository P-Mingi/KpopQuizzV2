// V12 F5b: the group hub with editorial (team) accounts. "From the community" rows
// carry the Team badge; the first-creator line falls back to the next creator who is
// not editorial. Flag off: no team read, the rows and the first creator of today.

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HubComment } from './data';

const fake = vi.hoisted(() => ({ log: [] as string[], comments: [] as unknown[] }));
const TEAM = '11111111-1111-4111-8111-111111111111';
const FAN = '22222222-2222-4222-8222-222222222222';

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
vi.mock('@/lib/live/server', () => ({ isLiveOpen: async () => false }));
vi.mock('@/lib/duel/server', () => ({ getFansPicked: async () => null }));
vi.mock('@/lib/name-all/server', () => ({ getNameAllSet: async () => null, getNameAllStats: async () => null }));
vi.mock('@/lib/personality/data', () => ({ getWmaGroupSlugs: async () => [], getMemberCounts: async () => null }));

function chain(table: string): unknown {
  let excluded = false;
  const result = (): { data: unknown[]; error: null; status: number } => {
    if (table === 'editorial_accounts') return { data: [{ user_id: TEAM, display_name: 'Team', beat: 'news', active: true }], error: null, status: 200 };
    if (table === 'profiles') return { data: [{ username: 'kpophistory' }], error: null, status: 200 };
    if (table === 'quizzes') {
      // the oldest quiz is the team's; the next one is a fan's
      const row = excluded
        ? { creator_id: FAN, profiles: { username: 'mina', banned_at: null } }
        : { creator_id: TEAM, profiles: { username: 'kpophistory', banned_at: null } };
      return { data: [row], error: null, status: 200 };
    }
    return { data: [], error: null, status: 200 };
  };
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      return (...args: unknown[]) => {
        if (prop === 'not') { excluded = true; fake.log.push(`${table}.not(${args.map(String).join(',')})`); }
        return proxy;
      };
    },
  });
  return proxy;
}
const client = { from: (t: string) => { fake.log.push(t); return chain(t); } };
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => client, createServiceRoleClient: () => client }));

async function flags(v12: boolean): Promise<void> {
  vi.resetModules();
  fake.log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
}
afterEach(() => { vi.unstubAllEnvs(); });

const G = { id: 7, slug: 'bts', name: 'BTS' };
const row = (u: string): HubComment => ({ id: u, text: 'so good', createdAt: '2026-10-01T00:00:00Z', quizSlug: 'q', quizTitle: 'Q', author: { username: u, avatarUrl: null, accent: 'pink', font: null } });

describe('first creator line', () => {
  it('no team: the oldest quiz creator, one query, no exclusion', async () => {
    await flags(false);
    const { getHubGrowth } = await import('./growth-data');
    const d = await getHubGrowth(G, 40, 0);
    expect(d.firstCreator?.username).toBe('kpophistory');
    expect(fake.log).not.toContain('editorial_accounts');
    expect(fake.log.some((l) => l.startsWith('quizzes.not'))).toBe(false);
  });

  it('team: falls back to the next creator who is not editorial', async () => {
    await flags(true);
    const { getHubGrowth } = await import('./growth-data');
    const d = await getHubGrowth(G, 40, 0);
    expect(d.firstCreator).toEqual({ username: 'mina', href: '/u/mina' });
    expect(fake.log).toContain(`quizzes.not(creator_id,in,(${TEAM}))`);
  });
});

describe('"From the community" rows', () => {
  it('markTeamAuthors: unchanged with no team, marks the team author', async () => {
    await flags(false);
    const { markTeamAuthors } = await import('./data');
    const rows = [row('kpophistory'), row('mina')];
    expect(markTeamAuthors(rows, new Set())).toBe(rows);
    expect(markTeamAuthors(rows, new Set(['kpophistory'])).map((r) => r.author?.team ?? false)).toEqual([true, false]);
  });

  it('flag off: getGroupCommentsWithTeam reads no team table', async () => {
    await flags(false);
    const { getGroupCommentsWithTeam } = await import('./data');
    await getGroupCommentsWithTeam(G.id);
    expect(fake.log).not.toContain('editorial_accounts');
    expect(fake.log).not.toContain('profiles');
  });

  it('render: Team badge and team avatar on the team row, no flair on it; the fan row as today', async () => {
    await flags(true);
    const { PersonName } = await import('@/components/ux-v1/person-name');
    const { UxAvatar } = await import('@/components/ux-v1/avatar');
    const team = renderToStaticMarkup(h('div', null, h(UxAvatar, { name: 'kpophistory', src: null, size: 40, team: true }), h(PersonName, { name: 'kpophistory', accent: 'pink', font: null, showBias: false, isTeam: true })));
    expect(team).toContain('ux-ava-team');
    expect(team).toMatch(/class="ux-teamtag"[^>]*>Team</);
    expect(team).not.toMatch(/Lv \d/);
    await flags(false);
    const { PersonName: PN } = await import('@/components/ux-v1/person-name');
    const fan = renderToStaticMarkup(h(PN, { name: 'kpophistory', accent: 'pink', font: null, showBias: false, isTeam: undefined }));
    expect(fan).not.toContain('ux-teamtag');
  });
});
