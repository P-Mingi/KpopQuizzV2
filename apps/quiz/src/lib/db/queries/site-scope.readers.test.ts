// Run O1, lane O1 (fix lot after the e2e pass): the kpop readers of the site-scoped tables go through forSite.
// A real supabase-js client with a recording fetch (nothing leaves the process) drives each reader family and the
// requests are read back. Per reader: with SITE_SCOPE off on kpop the request is today's (no site_id), with it on
// every request of a scoped table carries site_id=eq.kpop and nothing else changes (the same URL once that filter is
// cut out), and the anime build filters on site_id=eq.anime whatever the flag.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => {
  const sent: string[] = [];
  const record = async (input: unknown, init?: { method?: string; headers?: unknown }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const u = new URL(href);
    sent.push(decodeURIComponent(u.pathname + u.search));
    const h = init?.headers;
    const accept = h instanceof Headers ? h.get('accept') : h && typeof h === 'object' ? String((h as Record<string, string>).Accept ?? (h as Record<string, string>).accept ?? '') : '';
    const wantsObject = (accept ?? '').includes('vnd.pgrst.object');
    const table = u.pathname.split('/').pop();
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
    if (wantsObject) {
      if (table === 'groups') return new Response(JSON.stringify({ id: 1, slug: 'g', name: 'G', quiz_count: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ code: 'PGRST116', message: 'no rows', details: '', hint: '' }), { status: 406, headers: { 'content-type': 'application/json' } });
    }
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
const SITE_FILTER = /[?&]site_id=eq\.(kpop|anime)/;

/** Runs `go` on a fresh module graph under one configuration and returns the requests it sent, in order. */
async function run<M>(config: Config, load: () => Promise<M>, go: (m: M) => Promise<unknown>): Promise<string[]> {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete process.env.SITE_SCOPE;
  if (config === 'kpop-on') process.env.SITE_SCOPE = '1';
  if (config === 'anime') vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  net.sent.length = 0;
  // A frozen clock: the trending readers put "now minus N days" in the request.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00.000Z'));
  const m = await load();
  await go(m).catch(() => undefined);
  return [...net.sent];
}

/** The three configurations of one reader, judged. `tables` are the scoped tables the reader must read at least once. */
async function judge<M>(load: () => Promise<M>, go: (m: M) => Promise<unknown>, tables: readonly string[]): Promise<void> {
  const off = await run('kpop-off', load, go);
  const on = await run('kpop-on', load, go);
  const anime = await run('anime', load, go);
  for (const t of tables) expect(off.some((u) => u.startsWith(`/rest/v1/${t}?`)), `${t} is read`).toBe(true);
  expect(off.filter((u) => SITE_FILTER.test(u)), 'SITE_SCOPE off on kpop: today\'s requests, no site_id').toEqual([]);
  expect(on.length, 'same number of requests with the scope on').toBe(off.length);
  expect(anime.length, 'same number of requests on the anime build').toBe(off.length);
  on.forEach((u, i) => {
    expect(u, 'scope on: site_id=eq.kpop').toContain('site_id=eq.kpop');
    expect(u.replace(/&site_id=eq\.kpop/, ''), 'scope on: only the site filter differs').toBe(off[i]);
  });
  anime.forEach((u) => expect(u, 'anime build: site_id=eq.anime whatever the flag').toContain('site_id=eq.anime'));
}

beforeEach(() => { net.sent.length = 0; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); delete process.env.SITE_SCOPE; vi.resetModules(); });

const Q = () => import('./quizzes');

describe('lib/db/queries/quizzes.ts: every read of quizzes goes through forSite', () => {
  const cases: Array<[string, (m: Awaited<ReturnType<typeof Q>>) => Promise<unknown>]> = [
    ['getQuizCardsByIds', (m) => m.getQuizCardsByIds(['q1'])],
    ['getQuizBySlug', (m) => m.getQuizBySlug('a-slug')],
    ['getQuizById', (m) => m.getQuizById('q1')],
    ['getAllQuizzes', (m) => m.getAllQuizzes(0, 5)],
    ['getBrowseQuizzes trending', (m) => m.getBrowseQuizzes({ offset: 0, limit: 5 })],
    ['getBrowseQuizzes new with filters', (m) => m.getBrowseQuizzes({ groupId: 3, quizType: 'true_false', language: 'en', sort: 'new', offset: 0, limit: 5 })],
    ['getBrowseQuizzes top_rated', (m) => m.getBrowseQuizzes({ sort: 'top_rated', offset: 0, limit: 5 })],
    ['getLanguageCounts', (m) => m.getLanguageCounts()],
    ['getTrendingQuizzes (7 days, then 30)', (m) => m.getTrendingQuizzes(0, 5)],
    ['getNewQuizzes', (m) => m.getNewQuizzes(0, 5)],
    ['getHardestQuizzes', (m) => m.getHardestQuizzes(0, 5)],
    ['getMostLikedQuizzes', (m) => m.getMostLikedQuizzes(0, 5)],
    ['getQuizzesByGroup popular', (m) => m.getQuizzesByGroup(1, 'popular', 0, 5)],
    ['getQuizzesByGroup hardest', (m) => m.getQuizzesByGroup(1, 'hardest', 0, 5)],
    ['getGroupQuizLinks', (m) => m.getGroupQuizLinks(1)],
    ['getQuizzesByCreator', (m) => m.getQuizzesByCreator('u1', 0, 5)],
    ['getQuizzesByDifficulty', (m) => m.getQuizzesByDifficulty('easy', 0, 5)],
    ['getQuizzesByYear', (m) => m.getQuizzesByYear(2026, 0, 5)],
    ['getQuizzesByType', (m) => m.getQuizzesByType('true_false', 0, 5)],
    ['getQuizOfTheDay (default site)', (m) => m.getQuizOfTheDay()],
  ];
  for (const [name, go] of cases) {
    it(name, async () => { await judge(Q, go, ['quizzes']); });
  }

  it('the trending reader sends two scoped requests when the first week is short', async () => {
    const on = await run('kpop-on', Q, (m) => m.getTrendingQuizzes(0, 5));
    expect(on.filter((u) => u.startsWith('/rest/v1/quizzes?'))).toHaveLength(2);
  });

  it('checkSlugExists stays unscoped on every build: quizzes.slug is unique across the network', async () => {
    for (const config of ['kpop-off', 'kpop-on', 'anime'] as const) {
      const sent = await run(config, Q, (m) => m.checkSlugExists('a-slug'));
      expect(sent).toHaveLength(1);
      expect(sent[0], config).not.toContain('site_id');
    }
  });
});

describe('groups readers: lib/db/queries/groups.ts and group-directory.ts', () => {
  const G = () => import('./groups');
  const D = () => import('./group-directory');
  it('getAllGroups', async () => { await judge(G, (m) => m.getAllGroups(), ['groups']); });
  it('getGroupBySlug (the group row and the published count of its quizzes)', async () => {
    await judge(G, (m) => m.getGroupBySlug('a-group'), ['groups', 'quizzes']);
  });
  it('getGroupByName', async () => { await judge(G, (m) => m.getGroupByName('A Group'), ['groups']); });
  it('getDirectoryGroups (published quiz rows and group rows)', async () => {
    await judge(D, (m) => m.getDirectoryGroups(), ['quizzes', 'groups']);
  });
});

describe('blind test and trivia readers', () => {
  it('getBlindtestStats (songs and groups counts)', async () => {
    await judge(() => import('./blindtest'), (m) => m.getBlindtestStats(), ['songs', 'groups']);
  });
  it('getAdvertisablePlaylists (the song pool and the group rows behind /blindtest and the sitemap)', async () => {
    await judge(() => import('@/lib/blind-test-playlists'), (m) => m.getAdvertisablePlaylists(), ['songs', 'groups']);
  });
  it('getOverriddenFacts (the quiz rows behind the trivia hubs)', async () => {
    await judge(() => import('@/lib/trivia/facts'), (m) => m.getOverriddenFacts(1, 'a-group'), ['quizzes']);
  });
  it('getRelatedQuizzes (the top quiz of each related hub)', async () => {
    await judge(() => import('./related-quizzes'), (m) => m.getRelatedQuizzes(['a-group', 'b-group']), ['quizzes']);
  });
});

// Run O1, C2 fix B1: the "load more" source of InfiniteQuizList reads quizzes through forSite on both sites.
describe('GET /api/quizzes and /api/quizzes/count (C2 B1)', () => {
  const R = () => import('@/app/api/quizzes/route');
  const C = async () => {
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '1'); // the count route answers 404 with the redesign flag off
    return import('@/app/api/quizzes/count/route');
  };
  const req = (qs: string) => new Request(`https://x.test/api/quizzes?${qs}`) as unknown as import('next/server').NextRequest;
  const cases: Array<[string, string]> = [
    ['trending (the default tab)', 'tab=trending&offset=10&limit=10'],
    ['new with every filter', 'tab=new&group_id=3&quiz_type=true_false&language=en&offset=0&limit=5'],
    ['most_liked', 'tab=most_liked'],
    ['all', 'tab=all'],
  ];
  for (const [name, qs] of cases) {
    it(`/api/quizzes ${name}`, async () => { await judge(R, (m) => m.GET(req(qs)), ['quizzes']); });
  }
  it('/api/quizzes/count', async () => { await judge(C, (m) => m.GET(), ['quizzes']); });
});

// Run O1, C2 fix S1: the slug-keyed readers of the anime twins of /name-all/[group] and /which-character/[group] read
// the group (and the profile rows) through forSite, so a kpop group is never served under the anime brand. The idol rows
// are keyed by the scoped group's id and stay as they are.
describe('name-all and personality group reads (C2 S1)', () => {
  const SCOPED = ['groups', 'personality_profiles'];
  async function readers(config: Config, load: () => Promise<unknown>, go: (m: never) => Promise<unknown>): Promise<string[]> {
    const sent = await run(config, load as () => Promise<never>, go);
    return sent.filter((u) => SCOPED.some((t) => u.startsWith(`/rest/v1/${t}?`)));
  }
  const judgeGroups = async (load: () => Promise<unknown>, go: (m: never) => Promise<unknown>): Promise<void> => {
    const off = await readers('kpop-off', load, go);
    const on = await readers('kpop-on', load, go);
    const anime = await readers('anime', load, go);
    expect(off.length, 'a scoped table is read').toBeGreaterThan(0);
    expect(off.filter((u) => SITE_FILTER.test(u)), 'SITE_SCOPE off on kpop: today\'s requests').toEqual([]);
    expect(on.length).toBe(off.length);
    expect(anime.length).toBe(off.length);
    on.forEach((u, i) => {
      expect(u).toContain('site_id=eq.kpop');
      expect(u.replace(/&site_id=eq\.kpop/, '')).toBe(off[i]);
    });
    anime.forEach((u) => expect(u).toContain('site_id=eq.anime'));
  };
  const N = () => import('@/lib/name-all/server');
  const P = () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:9'); // the personality reader answers its fallback without a database env
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'o1-fake-anon-key');
    return import('@/lib/personality/data');
  };
  it('getNameAllSet (the group row)', async () => { await judgeGroups(N, ((m: Awaited<ReturnType<typeof N>>) => m.getNameAllSet('bts')) as never); });
  it('getWmaData (the group row and its profiles)', async () => { await judgeGroups(P, ((m: Awaited<ReturnType<typeof P>>) => m.getWmaData('bts')) as never); });
  it('getWmaGroupSlugs (the profile rows behind the slug list)', async () => { await judgeGroups(P, ((m: Awaited<ReturnType<typeof P>>) => m.getWmaGroupSlugs()) as never); });
  it('getBridgeGroups (the bridge group rows)', async () => { await judgeGroups(P, ((m: Awaited<ReturnType<typeof P>>) => m.getBridgeGroups()) as never); });
});
