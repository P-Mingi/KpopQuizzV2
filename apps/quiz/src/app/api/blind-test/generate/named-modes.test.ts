import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// F6a (AU1 I2, G2 request R6): /blindtest/kpop-legends and /blindtest/title-tracks play as named
// (flag on) once their pool fills a round; under 10 playable songs, on a failed read and with the
// flag off they keep their v11 run. generate builds the pool each of them names.

type Call = [string, ...unknown[]];
const recorded: Call[][] = [];
let songCount = 0;
let songError: unknown = null;
let songRows: Record<string, unknown>[] = [];

function builder(table: string): unknown {
  const calls: Call[] = [];
  recorded.push(calls);
  const answer = () => (table === 'songs' ? { data: songRows, error: songError, count: songCount } : { data: null, error: null, count: 0 });
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: null, error: null });
      if (prop === 'range') return (from: number) => Promise.resolve(from === 0 ? answer() : { data: [], error: null });
      return (...args: unknown[]) => { calls.push([prop, ...args]); return proxy; };
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ from: (t: string) => builder(t) }),
  createPublicReadClient: () => ({ from: (t: string) => builder(t) }),
}));

function flags(v1: string, v12: string): void {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v1);
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12);
}
const has = (calls: Call[], ...want: unknown[]): boolean => calls.some((c) => JSON.stringify(c) === JSON.stringify(want));

beforeEach(() => {
  recorded.length = 0; songCount = 0; songError = null;
  songRows = Array.from({ length: 30 }, (_, i) => ({
    id: `s${i}`, deezer_track_id: 1000 + i, title: `Song ${i}`, artist_name: `Act ${i % 4}`, album_name: null,
    album_cover_medium: null, album_cover_big: null, preview_url: 'https://cdn.example/p.mp3',
    gender: 'gg', generation: '3rd', tier: 'popular', deezer_rank: i,
  }));
  vi.stubEnv('SONGS_IS_CURATED', 'true');
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('the run of kpop-legends and title-tracks', () => {
  it('flag on and the pool fills a round: each plays its own playlist, as named', async () => {
    flags('1', '1');
    const { modeRun, NAMED_WHEN_PLAYABLE } = await import('@/lib/ux-v1/p6/modes');
    expect([...NAMED_WHEN_PLAYABLE].sort()).toEqual(['kpop-legends', 'title-tracks']);
    expect(modeRun('kpop-legends', null, true)).toEqual({ pick: { playlist: 'kpop-legends', label: 'K-pop legends' }, count: 10, exact: true });
    expect(modeRun('title-tracks', null, true)).toEqual({ pick: { playlist: 'title-tracks', label: 'Title tracks only' }, count: 10, exact: true });
  });

  it('flag on but not playable (or not read): the v11 run, unchanged', async () => {
    flags('1', '1');
    const { modeRun } = await import('@/lib/ux-v1/p6/modes');
    expect(modeRun('kpop-legends')).toEqual({ pick: { playlist: 'all', label: 'All K-pop' }, count: 10, exact: false });
    expect(modeRun('title-tracks', null, false)!.pick).toEqual({ playlist: 'hits', label: 'Hits' });
  });

  for (const [state, v1, v12] of [['v11 only', '1', ''], ['both off', '', '']] as const) {
    it(`${state}: the v11 run even when told the pool is playable`, async () => {
      flags(v1, v12);
      const { modeRun } = await import('@/lib/ux-v1/p6/modes');
      expect(modeRun('kpop-legends', null, true)!.pick).toEqual({ playlist: 'all', label: 'All K-pop' });
      expect(modeRun('title-tracks', null, true)!.pick).toEqual({ playlist: 'hits', label: 'Hits' });
    });
  }

  it('the flag does not leak to any other mode', async () => {
    flags('1', '1');
    const { modeRun } = await import('@/lib/ux-v1/p6/modes');
    for (const id of ['classic', 'b-sides', 'recent-hits', 'speed-round', 'kpop-demon-hunters']) {
      expect(modeRun(id, null, true), id).toEqual(modeRun(id, null, false));
    }
  });
});

describe('isNamedModePlayable: the hidden-under-10 rule on generate\'s own pool', () => {
  it('kpop-legends counts curated active songs of 2017 or earlier; 9 hides, 10 plays', async () => {
    flags('1', '1');
    const { isNamedModePlayable } = await import('@/lib/blind-test-playlists');
    songCount = 9;
    expect(await isNamedModePlayable('kpop-legends')).toBe(false);
    const q = recorded.at(-1)!;
    expect(has(q, 'in', 'status', ['active'])).toBe(true);
    expect(has(q, 'eq', 'is_curated', true)).toBe(true);
    expect(has(q, 'lte', 'year', 2017)).toBe(true);
    songCount = 10;
    expect(await isNamedModePlayable('kpop-legends')).toBe(true);
  });

  it('title-tracks counts curated active title tracks', async () => {
    flags('1', '1');
    const { isNamedModePlayable } = await import('@/lib/blind-test-playlists');
    songCount = 41;
    expect(await isNamedModePlayable('title-tracks')).toBe(true);
    const q = recorded.at(-1)!;
    expect(has(q, 'eq', 'status', 'active')).toBe(true);
    expect(has(q, 'eq', 'is_curated', true)).toBe(true);
    expect(has(q, 'eq', 'is_title_track', true)).toBe(true);
  });

  it('fails closed on an error, false for other ids, and no query with the flag off', async () => {
    flags('1', '1');
    let mod = await import('@/lib/blind-test-playlists');
    songCount = 500; songError = { message: 'down' };
    expect(await mod.isNamedModePlayable('kpop-legends')).toBe(false);
    songError = null;
    expect(await mod.isNamedModePlayable('classic')).toBe(false);
    flags('1', '');
    mod = await import('@/lib/blind-test-playlists');
    recorded.length = 0;
    expect(await mod.isNamedModePlayable('kpop-legends')).toBe(false);
    expect(await mod.isNamedModePlayable('title-tracks')).toBe(false);
    expect(recorded).toHaveLength(0);
  });
});

describe('generate builds the pool each named run asks for', () => {
  it('kpop-legends (flag on): curated active songs of 2017 or earlier', async () => {
    flags('1', '1');
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ playlist: 'kpop-legends', count: 10, mode: 'challenge' }) }) as never);
    expect(res.status).toBe(200);
    const pool = recorded.find((c) => c.some((x) => x[0] === 'select' && String(x[1]).includes('preview_url')))!;
    expect(has(pool, 'lte', 'year', 2017)).toBe(true);
    expect(has(pool, 'eq', 'is_curated', true)).toBe(true);
  });

  it('title-tracks: curated active title tracks', async () => {
    flags('1', '1');
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ playlist: 'title-tracks', count: 10, mode: 'challenge' }) }) as never);
    expect(res.status).toBe(200);
    const pool = recorded.find((c) => c.some((x) => x[0] === 'select' && String(x[1]).includes('preview_url')))!;
    expect(has(pool, 'eq', 'is_title_track', true)).toBe(true);
    expect(has(pool, 'eq', 'is_curated', true)).toBe(true);
    expect(has(pool, 'eq', 'status', 'active')).toBe(true);
  });
});
