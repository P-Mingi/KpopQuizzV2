// Run O1, lot (b), lane P1: POST /api/follow on anime goes to world_follows of the site (never to the kpop follows),
// refuses a Team account on either side, and sends no kpop notification. On kpop it is today's route.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'me' } as { id: string } | null,
  team: new Set<string>(),
  writes: [] as Array<{ table: string; op: string; row?: Record<string, unknown>; eq?: Array<[string, unknown]> }>,
  followRows: [] as Array<Record<string, unknown>>,
  notified: 0,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      const eqs: Array<[string, unknown]> = [];
      const b = {
        select: () => b,
        eq(c: string, v: unknown) { eqs.push([c, v]); return b; },
        maybeSingle: async () => {
          if (table === 'profiles') return { data: { id: 'target', username: 'target' }, error: null };
          return { data: state.followRows[0] ?? null, error: null };
        },
        insert: async (row: Record<string, unknown>) => { state.writes.push({ table, op: 'insert', row }); return { error: null }; },
        delete: () => ({ eq: (c: string, v: unknown) => { const e: Array<[string, unknown]> = [[c, v]]; const chain = { eq: (c2: string, v2: unknown) => { e.push([c2, v2]); return chain; }, then: (r: (v: { error: null }) => unknown) => { state.writes.push({ table, op: 'delete', eq: e }); return r({ error: null }); } }; return chain; } }),
      };
      return b;
    },
  }),
}));
vi.mock('@/lib/notifications', () => ({ notifyNewFollower: async () => { state.notified += 1; } }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async (id: string) => state.team.has(id) }));

async function load(site: 'anime' | 'kpop') {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return import('./route');
}
const post = (body: unknown): NextRequest => new NextRequest('http://x.test/api/follow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => { Object.assign(state, { user: { id: 'me' }, team: new Set<string>(), writes: [], followRows: [], notified: 0 }); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('/api/follow on anime', () => {
  it('follows into world_follows of the site, without a kpop notification', async () => {
    const { POST } = await load('anime');
    const res = await POST(post({ username: 'target', action: 'follow' }));
    expect(await res.json()).toEqual({ following: true });
    expect(state.writes).toEqual([{ table: 'world_follows', op: 'insert', row: { site_id: 'anime', follower_id: 'me', followed_id: 'target' } }]);
    expect(state.notified).toBe(0);
  });
  it('unfollows from world_follows of the site only', async () => {
    const { POST } = await load('anime');
    const res = await POST(post({ username: 'target', action: 'unfollow' }));
    expect(await res.json()).toEqual({ following: false });
    expect(state.writes).toEqual([{ table: 'world_follows', op: 'delete', eq: [['site_id', 'anime'], ['follower_id', 'me'], ['followed_id', 'target']] }]);
  });
  it('refuses a Team account as the followed or as the follower, and writes nothing', async () => {
    const { POST } = await load('anime');
    state.team = new Set(['target']);
    expect((await POST(post({ username: 'target', action: 'follow' }))).status).toBe(403);
    state.team = new Set(['me']);
    expect((await POST(post({ username: 'target', action: 'follow' }))).status).toBe(403);
    expect(state.writes).toEqual([]);
  });
  it('GET reads world_follows', async () => {
    const { GET } = await load('anime');
    state.followRows = [{ follower_id: 'me' }];
    const res = await GET(new NextRequest('http://x.test/api/follow?username=target'));
    expect(await res.json()).toEqual({ signedIn: true, isSelf: false, following: true });
  });
});

describe('/api/follow on kpop', () => {
  it('is today\'s route: the follows table and the notification, no Team check', async () => {
    const { POST } = await load('kpop');
    state.team = new Set(['target']);
    const res = await POST(post({ username: 'target', action: 'follow' }));
    expect(await res.json()).toEqual({ following: true });
    expect(state.writes).toEqual([{ table: 'follows', op: 'insert', row: { follower_id: 'me', followed_id: 'target' } }]);
    expect(state.notified).toBe(1);
  });
});
