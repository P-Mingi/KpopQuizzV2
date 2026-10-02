import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { BT_MODES, BT_PLAYLIST_RE, BT_SOURCES, bestCombo, btPlaylistId, btSourceFor, buildBtPayload } from './bt-shared';
import {
  MAX_ROUNDS, RATE_MAX_PER_ANON, classifyUserAgent, createRateLimiter, impossibleTimings, isNotLiveError, isTestEnv, parseBtEvent,
} from './bt-server';

const RUN = '0b6f3c1e-8a55-4f7e-9d58-0d4c1b7f5a01';
const ANON = '5d0e6c53-2f62-4a41-8f0e-3f1c9a2b7c11';
const SONG = (i: number): string => `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`;
const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const ctx = { run_id: RUN, playlist: 'all', mode: 'classic', source: 'hub', locale: 'en', rounds: 10 } as const;
const start = { event: 'start', anon_id: ANON, clip_played: true, ...ctx };
const songs = (count: number, ms = 3200): Array<{ song_id: string; kind: string; correct: boolean; ms: number }> =>
  Array.from({ length: count }, (_, i) => ({ song_id: SONG(i), kind: i % 2 ? 'artist' : 'title', correct: i % 3 !== 0, ms }));
const finish = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  event: 'finish', anon_id: ANON, ...ctx, answered: 10, correct: 6, score: 1240, best_combo: 3, duration_ms: 95_000, completed: true, songs: songs(10), ...over,
});

describe('playlist ids (bt_runs.playlist)', () => {
  it.each([
    [{ kind: 'free', playlist: 'all' }, 'all'],
    [{ kind: 'free', playlist: '' }, 'all'],
    [{ kind: 'free', playlist: 'gg' }, 'theme:gg'],
    [{ kind: 'free', playlist: '3rd-gen' }, 'theme:3rd-gen'],
    [{ kind: 'free', playlist: 'hits-2026' }, 'theme:hits-2026'],
    [{ kind: 'free', playlist: 'bts', groups: ['bts'] }, 'group:bts'],
    [{ kind: 'free', playlist: 'all', groups: ['twice', 'bts', 'twice'] }, 'group:bts+twice'],
    [{ kind: 'daily', now: new Date('2026-10-02T23:59:00Z') }, 'daily:2026-10-02'],
    [{ kind: 'challenge', code: 'AB12CD' }, 'challenge:AB12CD'],
    [{ kind: 'challenge' }, 'challenge:unknown'],
    [{ kind: 'free', playlist: 'weird id/../x' }, 'theme:weird-id-..-x'],
  ] as const)('%o -> %s', (input, id) => {
    const out = btPlaylistId(input);
    expect(out).toBe(id);
    expect(BT_PLAYLIST_RE.test(out)).toBe(true);
  });
});

describe('source of a run', () => {
  it.each([
    ['free', '/blindtest', '', 'hub'],
    ['free', '/pt/blindtest', '', 'hub'],
    ['free', '/blindtest/', '', 'hub'],
    ['free', '/guess-the-kpop-song', '', 'landing-en'],
    ['free', '/fr/blind-test-kpop', '', 'landing-fr'],
    ['free', '/es/adivina-la-cancion-kpop', '', 'landing-es'],
    ['free', '/id/tebak-lagu-kpop', '', 'landing-id'],
    ['free', '/groups/bts', '', 'group-hub'],
    ['free', '/blindtest/girl-groups', '', 'other'],
    ['free', '/live/ABCD', '', 'live'],
    ['free', '/blindtest', '?ref=share', 'share'],
    ['daily', '/blindtest', '?daily=true', 'daily'],
    ['challenge', '/blindtest', '?ref=share', 'challenge'],
  ] as const)('%s on %s%s -> %s', (kind, path, search, source) => {
    expect(btSourceFor(kind, path, search)).toBe(source);
    expect(BT_SOURCES).toContain(source);
  });
});

describe('payloads', () => {
  it('start carries the context, the anon id and clip_played', () => {
    expect(buildBtPayload({ event: 'start', ...ctx }, ANON)).toEqual({ event: 'start', anon_id: ANON, clip_played: true, ...ctx });
  });

  it('finish carries the result; a malformed anon id is sent as null', () => {
    const p = buildBtPayload({ event: 'finish', ...ctx, answered: 2, correct: 1, score: 150, best_combo: 1, duration_ms: 9000, completed: false, songs: [] }, 'not-a-uuid');
    expect(p).toEqual({ event: 'finish', anon_id: null, ...ctx, answered: 2, correct: 1, score: 150, best_combo: 1, duration_ms: 9000, completed: false, songs: [] });
  });

  it('bestCombo is the longest run of right answers', () => {
    expect(bestCombo([])).toBe(0);
    expect(bestCombo([true, true, false, true, true, true, false].map((correct) => ({ correct })))).toBe(3);
  });
});

describe('parseBtEvent: validation and clamps', () => {
  it('accepts a start and a finish as the client builds them', () => {
    expect(parseBtEvent(start)).toEqual({ ok: true, event: { event: 'start', anon_id: ANON, ...ctx } });
    const f = parseBtEvent(finish());
    expect(f.ok).toBe(true);
    if (f.ok && f.event.event === 'finish') {
      expect(f.event).toMatchObject({ answered: 10, correct: 6, score: 1240, best_combo: 3, duration_ms: 95_000, completed: true });
      expect(f.event.songs).toHaveLength(10);
      expect(f.event.songs[1]).toEqual({ song_id: SONG(1), kind: 'artist', correct: true, ms: 3200 });
    }
  });

  it.each([
    ['not an object', 'x'],
    ['an array', []],
    ['unknown event', { ...start, event: 'pause' }],
    ['bad run id', { ...start, run_id: 'run-1' }],
    ['bad playlist', { ...start, playlist: 'group:' }],
    ['playlist with a space', { ...start, playlist: 'theme:a b' }],
    ['unknown mode', { ...start, mode: 'karaoke' }],
    ['no rounds', { ...start, rounds: 0 }],
    ['rounds not a number', { ...start, rounds: '10' }],
  ])('refuses %s', (_label, body) => {
    expect(parseBtEvent(body)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('drops a start without a played clip', () => {
    expect(parseBtEvent({ ...start, clip_played: false })).toEqual({ ok: false, reason: 'no_clip' });
    const { clip_played: _dropped, ...noClip } = start;
    expect(parseBtEvent(noClip)).toEqual({ ok: false, reason: 'no_clip' });
  });

  it('every mode of the vocabulary is accepted', () => {
    for (const mode of BT_MODES) expect(parseBtEvent({ ...start, mode }).ok).toBe(true);
  });

  it('an unknown source or locale falls back instead of losing the run', () => {
    const r = parseBtEvent({ ...start, source: 'tiktok', locale: 'EN_us', anon_id: 'nope' });
    expect(r).toEqual({ ok: true, event: { event: 'start', ...ctx, source: 'other', locale: 'en', anon_id: null } });
  });

  it('clamps every number', () => {
    const r = parseBtEvent(finish({ rounds: 9999, answered: 9999, correct: 9999, score: 1e12, best_combo: 9999, duration_ms: 1e12, songs: songs(80, 999_999) }));
    expect(r.ok).toBe(true);
    if (r.ok && r.event.event === 'finish') {
      expect(r.event.rounds).toBe(MAX_ROUNDS);
      expect(r.event.answered).toBe(MAX_ROUNDS);
      expect(r.event.correct).toBe(MAX_ROUNDS);
      expect(r.event.best_combo).toBe(MAX_ROUNDS);
      expect(r.event.score).toBe(1_000_000);
      expect(r.event.duration_ms).toBe(3 * 60 * 60 * 1000);
      expect(r.event.songs).toHaveLength(MAX_ROUNDS);
      expect(r.event.songs.every((s) => s.ms === 60_000)).toBe(true);
    }
  });

  it('correct never exceeds answered, answered never exceeds rounds, negatives become 0', () => {
    const r = parseBtEvent(finish({ answered: 4, correct: 9, best_combo: 9, score: -5, duration_ms: 30_000, songs: songs(4), completed: false }));
    expect(r.ok && r.event.event === 'finish' ? [r.event.answered, r.event.correct, r.event.best_combo, r.event.score, r.event.duration_ms] : null).toEqual([4, 4, 4, 0, 30_000]);
  });

  it('keeps only well-formed songs, once each', () => {
    const r = parseBtEvent(finish({
      songs: [
        { song_id: SONG(1), kind: 'title', correct: true, ms: 2000 },
        { song_id: SONG(1), kind: 'title', correct: false, ms: 2000 },
        { song_id: 'round-3', kind: 'title', correct: true, ms: 2000 },
        { song_id: SONG(2), kind: 'lyrics', correct: 'yes', ms: 'fast' },
        null,
        'x',
      ],
    }));
    expect(r.ok && r.event.event === 'finish' ? r.event.songs : null).toEqual([
      { song_id: SONG(1), kind: 'title', correct: true, ms: 2000 },
      { song_id: SONG(2), kind: 'title', correct: false, ms: 0 },
    ]);
  });

  it('an abandoned run stays abandoned; completed needs at least one answer', () => {
    const quit = parseBtEvent(finish({ completed: false, answered: 3, correct: 2, songs: songs(3) }));
    expect(quit.ok && quit.event.event === 'finish' && quit.event.completed).toBe(false);
    const empty = parseBtEvent(finish({ completed: true, answered: 0, correct: 0, songs: [] }));
    expect(empty.ok && empty.event.event === 'finish' && empty.event.completed).toBe(false);
  });

  it('drops impossible timings', () => {
    expect(parseBtEvent(finish({ songs: songs(10, 40) }))).toEqual({ ok: false, reason: 'impossible' });
    expect(parseBtEvent(finish({ duration_ms: 300 }))).toEqual({ ok: false, reason: 'impossible' });
    expect(impossibleTimings({ answered: 2, duration_ms: 10, songs: [] })).toBe(false);
    expect(impossibleTimings({ answered: 10, duration_ms: 60_000, songs: songs(10, 900) as never })).toBe(false);
  });
});

describe('user agent class', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'mobile'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36', 'mobile'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'desktop'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0', 'desktop'],
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'bot'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36', 'bot'],
    ['curl/8.6.0', 'bot'],
    ['python-requests/2.32.0', 'bot'],
    ['', 'bot'],
    [null, 'bot'],
  ] as const)('%s -> %s', (ua, cls) => {
    expect(classifyUserAgent(ua)).toBe(cls);
  });
});

describe('is_test', () => {
  it('is false only on the production deployment', () => {
    expect(isTestEnv('production')).toBe(false);
    expect(isTestEnv('preview')).toBe(true);
    expect(isTestEnv('development')).toBe(true);
    expect(isTestEnv(undefined)).toBe(true);
    expect(isTestEnv('')).toBe(true);
  });

  it('comes from VERCEL_ENV and nothing in the route or the rules reads the Host header', () => {
    const server = read('./bt-server.ts');
    const route = read('../../app/api/track/bt-run/route.ts');
    expect(server).toMatch(/process\.env\.VERCEL_ENV/);
    for (const text of [server, route]) {
      expect(text).not.toMatch(/headers\.get\(\s*['"](x-forwarded-)?host['"]\s*\)/i);
      expect(text).not.toMatch(/nextUrl\.(host|hostname|origin)|req\.url|request\.url/);
    }
    expect(route).toMatch(/is_test: isTestEnv\(\)/);
  });
});

describe('rate limit', () => {
  it('lets a key through up to its limit inside the window, then again after it', () => {
    const rl = createRateLimiter(1000);
    for (let i = 0; i < 3; i += 1) expect(rl.hit('a', 3, 100 + i)).toBe(true);
    expect(rl.hit('a', 3, 200)).toBe(false);
    expect(rl.hit('b', 3, 200)).toBe(true);
    expect(rl.hit('a', 3, 1300)).toBe(true);
  });

  it('stays bounded', () => {
    const rl = createRateLimiter(1000, 5);
    for (let i = 0; i < 50; i += 1) rl.hit(`k${i}`, 1, 0);
    expect(rl.size()).toBeLessThanOrEqual(5);
  });

  it('a browser can record 30 runs in the window', () => {
    expect(RATE_MAX_PER_ANON).toBe(60);
  });
});

describe('fail soft', () => {
  it.each([
    [{ code: '42P01', message: 'relation "public.bt_runs" does not exist' }, true],
    [{ code: 'PGRST205', message: "Could not find the table 'public.bt_runs' in the schema cache" }, true],
    [{ code: 'PGRST202', message: 'Could not find the function public.bt_runs_admin_stats(p_days) in the schema cache' }, true],
    [{ code: '42883', message: 'function public.bt_bump_song_plays(uuid[]) does not exist' }, true],
    [{ code: '23514', message: 'new row violates check constraint' }, false],
    [{ code: '57014', message: 'canceling statement due to statement timeout' }, false],
    [null, false],
  ])('%o -> not live %s', (err, expected) => {
    expect(isNotLiveError(err)).toBe(expected);
  });
});

describe('the route and the pages follow NEXT_PUBLIC_BT_TRACKING alone', () => {
  const route = read('../../app/api/track/bt-run/route.ts');
  const admin = read('../../app/(site)/admin/blind-tests/runs/page.tsx');
  const client = read('./bt.ts');

  it('the endpoint answers 404 first thing when the switch is off', () => {
    expect(route).toMatch(/export async function POST\(req: NextRequest\): Promise<NextResponse> \{\n {2}if \(!BT_TRACKING\) return json\(\{ error: 'not_found' \}, 404\);/);
  });

  it('the admin page is a 404 when the switch is off, then admin only', () => {
    expect(admin).toMatch(/if \(!BT_TRACKING\) notFound\(\);[\s\S]*if \(!user \|\| !isAdmin\(user\.id\)\) redirect\('\/'\);/);
  });

  it('none of them reads the v11 or v12 flag', () => {
    for (const text of [route, admin, client, read('./bt-shared.ts'), read('./bt-server.ts')]) {
      expect(text).not.toMatch(/UX_V1\b|isUxV12|NEXT_PUBLIC_UX_V1/);
    }
  });

  it('bt_runs is written by the service role only, and never from browser code', () => {
    expect(route).toMatch(/const db = createServiceRoleClient\(\);/);
    expect(route).not.toMatch(/auth\s*\.from\('bt_runs'\)/);
    expect(client).not.toMatch(/supabase|from\('bt_runs'\)/);
  });

  it('the song counter is bumped only for a written finish outside test runs', () => {
    expect(route).toMatch(/if \(e\.event === 'finish' && res\.written && !isTestEnv\(\)\) \{[\s\S]*rpc\('bt_bump_song_plays'/);
  });

  it('no IP and no user agent string reaches the row', () => {
    const row = /function baseRow[\s\S]*?\n}\n/.exec(route)?.[0] ?? '';
    expect(row).toContain('user_agent_class: uaClass');
    expect(row).not.toMatch(/ip|forwarded|user-agent/i);
  });
});

describe('trackBtRun in the browser', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function load(flag: string | undefined): Promise<{
    mod: typeof import('./bt');
    fetchMock: ReturnType<typeof vi.fn>;
    beacon: ReturnType<typeof vi.fn>;
  }> {
    vi.resetModules();
    if (flag === undefined) vi.stubEnv('NEXT_PUBLIC_BT_TRACKING', '');
    else vi.stubEnv('NEXT_PUBLIC_BT_TRACKING', flag);
    const store = new Map<string, string>([['nq_anon_id', ANON]]);
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));
    const beacon = vi.fn(() => true);
    vi.stubGlobal('window', {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } },
      location: { pathname: '/blindtest', search: '' },
    });
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    vi.stubGlobal('fetch', fetchMock);
    const mod = await import('./bt');
    return { mod, fetchMock, beacon };
  }

  const result = { answered: 3, correct: 2, score: 310, best_combo: 2, duration_ms: 21_000, songs: [] };

  it('sends nothing when the switch is off', async () => {
    const { mod, fetchMock, beacon } = await load(undefined);
    expect(mod.newBtRunId()).toBeNull();
    expect(mod.trackBtRun({ event: 'start', ...ctx })).toBe(false);
    expect(mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: false })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('start and a completed finish go through fetch keepalive, once each', async () => {
    const { mod, fetchMock, beacon } = await load('1');
    expect(mod.trackBtRun({ event: 'start', ...ctx })).toBe(true);
    expect(mod.trackBtRun({ event: 'start', ...ctx })).toBe(false);
    expect(mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: true })).toBe(true);
    expect(mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: false })).toBe(false);
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/track/bt-run');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(String(init.body))).toEqual({ event: 'start', anon_id: ANON, clip_played: true, ...ctx });
    const second = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(String(second[1].body))).toMatchObject({ event: 'finish', completed: true, score: 310 });
  });

  it('an abandoned run goes through sendBeacon with completed = false', async () => {
    const { mod, fetchMock, beacon } = await load('1');
    mod.trackBtRun({ event: 'start', ...ctx });
    expect(mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: false })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe('/api/track/bt-run');
    expect(JSON.parse(await blob.text())).toMatchObject({ event: 'finish', run_id: RUN, completed: false, answered: 3, anon_id: ANON });
  });

  it('a start after the finish of the same run is not sent, and a bad run id never is', async () => {
    const { mod, fetchMock } = await load('1');
    mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: true });
    expect(mod.trackBtRun({ event: 'start', ...ctx })).toBe(false);
    expect(mod.trackBtRun({ event: 'start', ...ctx, run_id: 'nope' })).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when the beacon is refused, and never throws', async () => {
    const { mod, fetchMock, beacon } = await load('1');
    beacon.mockReturnValue(false);
    expect(mod.trackBtRun({ event: 'finish', ...ctx, ...result, completed: false })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockImplementation(() => { throw new Error('blocked'); });
    expect(mod.trackBtRun({ event: 'start', ...ctx, run_id: RUN.replace(/1$/, '2') })).toBe(false);
  });
});
