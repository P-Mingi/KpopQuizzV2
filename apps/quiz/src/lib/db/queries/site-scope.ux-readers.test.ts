// Run O1, lane O1: the readers behind the v11 pages (home, quizzes, groups index, blindtest hub, leaderboard, community feed,
// public counts, creators, the public search and activity endpoints) send every read of a site-scoped table through forSite.
// Same method as site-scope.readers.test.ts: a real supabase-js client with a recording fetch. Per reader: SITE_SCOPE off on
// kpop sends today's requests (no site_id anywhere), the scope on adds site_id=eq.kpop to the requests of the scoped tables
// and changes nothing else, the anime build always sends site_id=eq.anime on them. A table without a site column never gets it.
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const SCOPED = new Set([
  'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications', 'activity_events',
  'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs', 'verse_threads', 'verse_essays', 'editorial_posts',
  'community_replies', 'community_debates', 'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles',
]);

const net = vi.hoisted(() => {
  const sent: string[] = [];
  const record = async (input: unknown, init?: { method?: string }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const u = new URL(href);
    sent.push(decodeURIComponent(u.pathname + u.search));
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': '*/0' } });
  };
  return { sent, record };
});

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient('http://127.0.0.1:9', 'o1-fake-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: net.record as unknown as typeof fetch },
  });
  return { createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client };
});

type Config = 'kpop-off' | 'kpop-on' | 'anime';
const tableOf = (u: string): string => u.split('?')[0]!.split('/').pop()!;
const SITE_FILTER = /&site_id=eq\.(kpop|anime)/;

async function run<M>(config: Config, load: () => Promise<M>, go: (m: M) => Promise<unknown>): Promise<string[]> {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete process.env.SITE_SCOPE;
  if (config === 'kpop-on') process.env.SITE_SCOPE = '1';
  if (config === 'anime') vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  net.sent.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00.000Z'));
  const m = await load();
  await go(m).catch(() => undefined);
  vi.useRealTimers();
  return [...net.sent];
}

async function judge<M>(load: () => Promise<M>, go: (m: M) => Promise<unknown>, tables: readonly string[]): Promise<void> {
  const off = await run('kpop-off', load, go);
  const on = await run('kpop-on', load, go);
  const anime = await run('anime', load, go);
  for (const t of tables) expect(off.some((u) => tableOf(u) === t), `${t} is read`).toBe(true);
  expect(off.filter((u) => u.includes('site_id=')), 'SITE_SCOPE off on kpop: today\'s requests').toEqual([]);
  expect(on.length).toBe(off.length);
  expect(anime.length).toBe(off.length);
  on.forEach((u, i) => {
    if (SCOPED.has(tableOf(u))) {
      expect(u, `scope on, ${tableOf(u)}`).toContain('site_id=eq.kpop');
      expect(u.replace(SITE_FILTER, ''), 'only the site filter differs').toBe(off[i]);
    } else {
      expect(u, `${tableOf(u)} has no site column`).not.toContain('site_id');
    }
  });
  anime.forEach((u) => {
    if (SCOPED.has(tableOf(u))) expect(u, `anime, ${tableOf(u)}`).toContain('site_id=eq.anime');
    else expect(u).not.toContain('site_id');
  });
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); delete process.env.SITE_SCOPE; vi.resetModules(); });

describe('home', () => {
  const H = () => import('@/lib/ux-v1/p1/home-data');
  it('getHomeGroups (published quiz rows and group rows)', async () => { await judge(H, (m) => m.getHomeGroups(), ['quizzes', 'groups']); });
  it('getHomeLists (trending, best and new quizzes)', async () => { await judge(H, (m) => m.getHomeLists([]), ['quizzes']); });
  it('getHomeQotd (the day\'s pick and the rotation pool)', async () => { await judge(H, (m) => m.getHomeQotd(new Date('2026-10-20T12:00:00Z')), ['quizzes']); });
});

describe('quizzes, groups and blindtest pages', () => {
  it('getP2FacetRows (/quizzes facets)', async () => {
    await judge(() => import('@/lib/ux-v1/p2/queries'), (m) => m.getP2FacetRows(), ['quizzes']);
  });
  it('getGroupsIndex (/groups)', async () => {
    await judge(() => import('@/lib/ux-v1/p3/data'), (m) => m.getGroupsIndex(), ['quizzes', 'groups']);
  });
  it('getPlayableGroups, getSongCount and getGroupPopularity (/blindtest)', async () => {
    const P = () => import('@/lib/ux-v1/p6/hub-data');
    await judge(P, (m) => m.getSongCount(), ['songs']);
    await judge(P, (m) => m.getPlayableGroups(), ['songs', 'groups']);
    await judge(P, (m) => m.getGroupPopularity(), ['quizzes', 'groups']);
  });
});

describe('leaderboard, community and counts', () => {
  it('getGroupFacts (the leaderboard\'s group names)', async () => {
    await judge(() => import('@/lib/ux-v1/p9/data'), (m) => m.getGroupFacts(), ['groups']);
  });
  it('getHappeningNow (the live feed)', async () => {
    await judge(() => import('./community'), (m) => m.getHappeningNow(5), ['activity_events']);
  });
  it('getPublicStats (the counts the pages print)', async () => {
    await judge(() => import('@/lib/stats/site-stats'), (m) => m.getPublicStats(), ['quizzes', 'groups', 'songs']);
  });
  it('getCreatorsPage (/creators)', async () => {
    await judge(() => import('@/lib/creators/data'), (m) => m.getCreatorsPage(), ['quizzes']);
  });
  it('the war map keeps only the groups of the site when the scope is on, every row otherwise', async () => {
    const { warMapFromRpc } = await import('@/lib/ux-v1/p9/data');
    const rows = ['bts', 'death-note'].map((slug) => ({ name: slug, slug, logo_url: null, display_color: '#000', plays_week: 10, fans_week: 3, plays_prev: 5 }));
    const facts = new Map([['bts', { slug: 'bts', name: 'bts', fandom_name: null, generation: null }]]);
    expect(warMapFromRpc(rows, 30, facts, true).map((r) => r.slug)).toEqual(['bts']);
    expect(warMapFromRpc(rows, 30, facts, false).map((r) => r.slug)).toEqual(['bts', 'death-note']);
  });
});

describe('public endpoints', () => {
  it('GET /api/activity/recent', async () => {
    await judge(() => import('@/app/api/activity/recent/route'), (m) => m.GET(new NextRequest('http://localhost/api/activity/recent')), ['activity_events']);
  });
  it('GET /api/quizzes/search', async () => {
    await judge(() => import('@/app/api/quizzes/search/route'), (m) => m.GET(new NextRequest('http://localhost/api/quizzes/search?q=death')), ['quizzes']);
  });
});
