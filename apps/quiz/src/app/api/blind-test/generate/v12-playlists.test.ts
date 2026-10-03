import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// V12 (G2): generate's year ranges, generation + gender pairs, curated id lists and the KPop
// Demon Hunters playlist; the non-active status that only that playlist reads; the
// hidden-under-10 rule; and the flag: with it off generate builds exactly today's queries.

// ----- a recording stand-in for the Supabase client (no network, no database) -----------------
type Call = [string, ...unknown[]];
interface Recorded { table: string; calls: Call[] }
const recorded: Recorded[] = [];
let songRows: Record<string, unknown>[] = [];

function builder(table: string): unknown {
  const rec: Recorded = { table, calls: [] };
  recorded.push(rec);
  const answer = (): { data: unknown; error: null; count: number } => {
    if (table !== 'songs') return { data: null, error: null, count: 0 };
    return { data: songRows, error: null, count: songRows.length };
  };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: null, error: null });
      if (prop === 'range') return (from: number) => { rec.calls.push(['range', from]); return Promise.resolve(from === 0 ? answer() : { data: [], error: null }); };
      return (...args: unknown[]) => { rec.calls.push([prop, ...args]); return proxy; };
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ from: (t: string) => builder(t) }),
  createPublicReadClient: () => ({ from: (t: string) => builder(t) }),
}));

const song = (i: number, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: `s${i}`, deezer_track_id: 1000 + i, title: `Song ${i}`, artist_name: `Act ${i % 4}`, album_name: null,
  album_cover_medium: null, album_cover_big: null, preview_url: 'https://cdn.example/p.mp3',
  gender: 'gg', generation: '4th', tier: 'popular', deezer_rank: i, ...over,
});

async function generate(body: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown>; pool: Call[] }> {
  recorded.length = 0;
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/blind-test/generate', { method: 'POST', body: JSON.stringify(body) }) as never);
  // The pool read is the songs query that selected the full row.
  const pool = recorded.filter((r) => r.table === 'songs' && r.calls.some((c) => c[0] === 'select' && String(c[1]).includes('preview_url'))).at(-1);
  return { status: res.status, json: (await res.json()) as Record<string, unknown>, pool: pool?.calls ?? [] };
}

function flags(v1: string | undefined, v12: string | undefined): void {
  vi.resetModules();
  if (v1 === undefined) vi.stubEnv('NEXT_PUBLIC_UX_V1', ''); else vi.stubEnv('NEXT_PUBLIC_UX_V1', v1);
  if (v12 === undefined) vi.stubEnv('NEXT_PUBLIC_UX_V12', ''); else vi.stubEnv('NEXT_PUBLIC_UX_V12', v12);
}

const has = (calls: Call[], ...want: unknown[]): boolean => calls.some((c) => JSON.stringify(c) === JSON.stringify(want));

beforeEach(() => {
  songRows = Array.from({ length: 30 }, (_, i) => song(i));
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })));
  vi.stubEnv('SONGS_IS_CURATED', 'true');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('the v12 flag', () => {
  it('is on only when both flags are on', async () => {
    for (const [v1, v12, on] of [['1', '1', true], ['true', 'true', true], ['1', undefined, false], [undefined, '1', false], [undefined, undefined, false], ['0', '1', false]] as const) {
      flags(v1, v12);
      const { themedModesOn } = await import('@/lib/blind-test-modes');
      expect(themedModesOn(), `v1=${v1} v12=${v12}`).toBe(on);
    }
  });

  it('STATIC_MODES is the 18 legacy modes with the flag off and gains the 5 themed modes with it on', async () => {
    flags('1', undefined);
    const off = await import('@/lib/blind-test-modes');
    expect(off.STATIC_MODES).toHaveLength(18);
    expect(off.STATIC_MODES.some((m) => off.THEMED_MODE_IDS.includes(m.id))).toBe(false);
    expect(off.staticModesFor(false).map((m) => m.id)).toEqual(off.STATIC_MODES.map((m) => m.id));

    flags('1', '1');
    const on = await import('@/lib/blind-test-modes');
    expect(on.STATIC_MODES).toHaveLength(23);
    expect(on.STATIC_MODES.slice(0, 18).map((m) => m.id)).toEqual(off.STATIC_MODES.map((m) => m.id));
    expect(on.STATIC_MODES.slice(18).map((m) => m.id)).toEqual(['kpop-hits-2026', 'kpop-hits-2025', '5th-gen', 'tiktok-viral', 'kpop-demon-hunters']);
    expect(new Set(on.STATIC_MODES.map((m) => m.id)).size).toBe(23);
  });

  it('v12Playlist answers null for every id with the flag off', async () => {
    flags('1', undefined);
    const { v12Playlist, V12_PLAYLIST_IDS } = await import('@/lib/blind-test-curated');
    for (const id of V12_PLAYLIST_IDS) expect(v12Playlist(id), id).toBeNull();
    for (const id of V12_PLAYLIST_IDS) expect(v12Playlist(id, true), id).not.toBeNull();
    expect(v12Playlist('all', true)).toBeNull();
    expect(v12Playlist('constructor', true)).toBeNull();
  });
});

describe('generate with the flag off (v11 only, and both off): today\'s queries', () => {
  for (const [name, v1] of [['v11 only', '1'], ['both off', undefined]] as const) {
    it(`${name}: the legacy playlists read active songs with their own filter`, async () => {
      flags(v1, undefined);
      const all = await generate({ playlist: 'all', count: 10, mode: 'challenge' });
      expect(all.status).toBe(200);
      expect(has(all.pool, 'eq', 'status', 'active')).toBe(true);
      expect(has(all.pool, 'eq', 'is_curated', true)).toBe(true);
      expect(all.pool.some((c) => c[0] === 'in' && c[1] === 'status')).toBe(false);
      expect((all.json.questions as unknown[]).length).toBe(10);
      expect(all.json).toMatchObject({ playlist: 'all', mode: 'challenge', timer_duration: 10, songs_count: 10 });

      const gen = await generate({ playlist: '5th-gen', count: 10 });
      expect(has(gen.pool, 'eq', 'generation', '5th')).toBe(true);
      const gg = await generate({ playlist: 'gg', count: 10 });
      expect(has(gg.pool, 'eq', 'gender', 'gg')).toBe(true);
    });

    it(`${name}: a v12 playlist id is not served (it falls to the group path, as any unknown id does today)`, async () => {
      flags(v1, undefined);
      for (const id of ['kpop-hits-2026', 'kpop-hits-2025', 'tiktok-viral', 'kpop-demon-hunters', 'recent-hits', 'kpop-legends', '4th-gen-gg', '4th-gen-bg']) {
        const r = await generate({ playlist: id, count: 10 });
        // Today's behaviour for an id generate does not know: a name search on artist_name, active songs only.
        expect(has(r.pool, 'ilike', 'artist_name', `%${id.replace(/-/g, ' ')}%`), id).toBe(true);
        expect(has(r.pool, 'eq', 'status', 'active'), id).toBe(true);
        expect(r.pool.some((c) => c[0] === 'gte' || c[0] === 'lte' || (c[0] === 'in' && (c[1] === 'deezer_track_id' || c[1] === 'status'))), id).toBe(false);
      }
    });
  }
});

describe('generate with the flag on: each v12 filter', () => {
  beforeEach(() => flags('1', '1'));

  it('year range: kpop-hits-2025 and kpop-hits-2026 read one year, curated subset, active only', async () => {
    for (const year of [2025, 2026]) {
      const r = await generate({ playlist: `kpop-hits-${year}`, count: 10 });
      expect(r.status).toBe(200);
      expect(has(r.pool, 'gte', 'year', year)).toBe(true);
      expect(has(r.pool, 'lte', 'year', year)).toBe(true);
      expect(has(r.pool, 'in', 'status', ['active'])).toBe(true);
      expect(has(r.pool, 'eq', 'is_curated', true)).toBe(true);
      expect(r.json.playlist).toBe(`kpop-hits-${year}`);
    }
  });

  it('year range: recent-hits is 2024 and later, kpop-legends is 2017 and earlier', async () => {
    const recent = await generate({ playlist: 'recent-hits', count: 10 });
    expect(has(recent.pool, 'gte', 'year', 2024)).toBe(true);
    expect(recent.pool.some((c) => c[0] === 'lte')).toBe(false);
    const legends = await generate({ playlist: 'kpop-legends', count: 10 });
    expect(has(legends.pool, 'lte', 'year', 2017)).toBe(true);
    expect(legends.pool.some((c) => c[0] === 'gte')).toBe(false);
  });

  it('generation + gender: 4th-gen-gg and 4th-gen-bg apply both', async () => {
    for (const g of ['gg', 'bg']) {
      const r = await generate({ playlist: `4th-gen-${g}`, count: 10 });
      expect(has(r.pool, 'eq', 'generation', '4th')).toBe(true);
      expect(has(r.pool, 'eq', 'gender', g)).toBe(true);
      expect(has(r.pool, 'in', 'status', ['active'])).toBe(true);
    }
  });

  it('curated id list: tiktok-viral reads its ids, active only, without the curated-subset switch', async () => {
    const { TIKTOK_VIRAL_DEEZER_IDS } = await import('@/lib/blind-test-curated');
    const r = await generate({ playlist: 'tiktok-viral', count: 10 });
    expect(has(r.pool, 'in', 'deezer_track_id', TIKTOK_VIRAL_DEEZER_IDS)).toBe(true);
    expect(has(r.pool, 'in', 'status', ['active'])).toBe(true);
    expect(has(r.pool, 'eq', 'is_curated', true)).toBe(false);
  });

  it('KPDH: reads its ids in active + its own status, and asks only "Name the song"', async () => {
    const { KPDH_DEEZER_IDS, KPDH_STATUS } = await import('@/lib/blind-test-curated');
    const r = await generate({ playlist: 'kpop-demon-hunters', count: 10 });
    expect(r.status).toBe(200);
    expect(has(r.pool, 'in', 'deezer_track_id', KPDH_DEEZER_IDS)).toBe(true);
    expect(has(r.pool, 'in', 'status', ['active', KPDH_STATUS])).toBe(true);
    const questions = r.json.questions as { question_type: string }[];
    expect(questions).toHaveLength(10);
    expect(questions.every((q) => q.question_type === 'title')).toBe(true);
  });

  it('a hits list keeps its best-ranked songs', async () => {
    songRows = Array.from({ length: 90 }, (_, i) => song(i));
    const r = await generate({ playlist: 'kpop-hits-2025', count: 10 });
    const titles = r.json.all_titles as string[];
    expect(titles).toHaveLength(60);
    expect(titles).toContain('Song 89');
    expect(titles).not.toContain('Song 29');
  });

  it('the legacy playlists are untouched by the flag', async () => {
    const all = await generate({ playlist: 'all', count: 10, mode: 'challenge' });
    expect(has(all.pool, 'eq', 'status', 'active')).toBe(true);
    expect(all.pool.some((c) => c[0] === 'in' && c[1] === 'status')).toBe(false);
    const gen = await generate({ playlist: '5th-gen', count: 10 });
    expect(has(gen.pool, 'eq', 'generation', '5th')).toBe(true);
    expect(has(gen.pool, 'eq', 'status', 'active')).toBe(true);
  });

  it('not enough songs answers 400 with the real count', async () => {
    songRows = Array.from({ length: 4 }, (_, i) => song(i));
    const r = await generate({ playlist: 'kpop-hits-2026', count: 10 });
    expect(r.status).toBe(400);
    expect(r.json).toMatchObject({ available: 4, needed: 10 });
  });

  it('a multi-group pick ignores a v12 playlist id', async () => {
    const r = await generate({ playlist: 'tiktok-viral', groups: ['bts'], count: 10 });
    expect(r.pool.some((c) => c[0] === 'in' && c[1] === 'deezer_track_id')).toBe(false);
    expect(has(r.pool, 'eq', 'status', 'active')).toBe(true);
  });
});

describe('the pool rule in plain code (songMatchesSpec)', () => {
  it('each filter keeps and drops the right songs', async () => {
    const { songMatchesSpec, V12_PLAYLISTS, KPDH_DEEZER_IDS, TIKTOK_VIRAL_DEEZER_IDS } = await import('@/lib/blind-test-curated');
    const base = { deezer_track_id: 1, status: 'active', title: 'A song', gender: 'gg', generation: '4th', year: 2025, is_curated: true };
    const m = (id: string, over: Record<string, unknown> = {}, curated = true): boolean => songMatchesSpec({ ...base, ...over }, V12_PLAYLISTS[id]!, curated);

    expect(m('kpop-hits-2025')).toBe(true);
    expect(m('kpop-hits-2025', { year: 2026 })).toBe(false);
    expect(m('kpop-hits-2025', { year: null })).toBe(false);
    expect(m('kpop-hits-2026', { year: 2026 })).toBe(true);
    expect(m('recent-hits', { year: 2024 })).toBe(true);
    expect(m('recent-hits', { year: 2023 })).toBe(false);
    expect(m('kpop-legends', { year: 2017 })).toBe(true);
    expect(m('kpop-legends', { year: 2018 })).toBe(false);
    expect(m('kpop-legends', { year: null })).toBe(false);
    expect(m('4th-gen-gg')).toBe(true);
    expect(m('4th-gen-gg', { gender: 'bg' })).toBe(false);
    expect(m('4th-gen-gg', { generation: '5th' })).toBe(false);
    expect(m('4th-gen-bg', { gender: 'bg' })).toBe(true);
    // the title guard and the curated switch
    expect(m('kpop-hits-2025', { title: 'A song (Remix)' })).toBe(false);
    expect(m('kpop-hits-2025', { title: 'A song (Inst.)' })).toBe(false);
    expect(m('kpop-hits-2025', { is_curated: false })).toBe(false);
    expect(m('kpop-hits-2025', { is_curated: false }, false)).toBe(true);
    // curated lists: by id, whatever the curated flag of the row
    expect(m('tiktok-viral', { deezer_track_id: TIKTOK_VIRAL_DEEZER_IDS[0], is_curated: false })).toBe(true);
    expect(m('tiktok-viral', { deezer_track_id: 1 })).toBe(false);
    expect(m('kpop-demon-hunters', { deezer_track_id: KPDH_DEEZER_IDS[0] })).toBe(true);
  });

  it('the KPDH status is excluded from every playlist but the KPDH one', async () => {
    const { songMatchesSpec, V12_PLAYLISTS, V12_PLAYLIST_IDS, KPDH_DEEZER_IDS, KPDH_STATUS, specStatuses } = await import('@/lib/blind-test-curated');
    expect(KPDH_STATUS).not.toBe('active');
    const fictional = { deezer_track_id: KPDH_DEEZER_IDS[2]!, status: KPDH_STATUS, title: 'Golden', gender: 'gg', generation: '4th', year: 2025, is_curated: true };
    for (const id of V12_PLAYLIST_IDS) {
      expect(songMatchesSpec(fictional, V12_PLAYLISTS[id]!, false), id).toBe(id === 'kpop-demon-hunters');
      expect(specStatuses(V12_PLAYLISTS[id]!).includes(KPDH_STATUS), id).toBe(id === 'kpop-demon-hunters');
    }
    // Even a KPDH row whose id were put in the TikTok list by mistake stays out: active only.
    expect(songMatchesSpec({ ...fictional, deezer_track_id: 2943563441 }, V12_PLAYLISTS['tiktok-viral']!, false)).toBe(false);
  });

  it('every other reader of generate asks for status = active (source check)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    // The only non-active read is the themed branch.
    expect(src).toContain("themed ? base.in('status', [...specStatuses(themed)]) : base.eq('status', 'active')");
    expect(src.match(/KPDH_STATUS|'soundtrack'/g)).toBeNull();
  });
});

describe('curated lists', () => {
  it('tiktok-viral: unique ids, one public source per song, enough for a round, no KPDH song', async () => {
    const { TIKTOK_VIRAL, KPDH_DEEZER_IDS } = await import('@/lib/blind-test-curated');
    expect(TIKTOK_VIRAL.length).toBeGreaterThanOrEqual(10);
    expect(new Set(TIKTOK_VIRAL.map((s) => s.deezerId)).size).toBe(TIKTOK_VIRAL.length);
    for (const s of TIKTOK_VIRAL) {
      expect(s.source, s.title).toMatch(/^https:\/\/[a-z0-9.-]+\//);
      expect(Number.isInteger(s.deezerId) && s.deezerId > 0, s.title).toBe(true);
      expect(KPDH_DEEZER_IDS.includes(s.deezerId), s.title).toBe(false);
    }
  });

  it('the list in code is the verified list (scripts/v12/catalogue/data/tiktok-viral.json)', async () => {
    const { TIKTOK_VIRAL } = await import('@/lib/blind-test-curated');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../../scripts/v12/catalogue/data/tiktok-viral.json'), 'utf8')) as { deezer_track_id: number; url: string }[];
    expect(TIKTOK_VIRAL.map((s) => [s.deezerId, s.source])).toEqual(data.map((d) => [d.deezer_track_id, d.url]));
  });

  it('KPDH: unique ids, a source each, TWICE listed by id', async () => {
    const { KPDH_SONGS } = await import('@/lib/blind-test-curated');
    expect(KPDH_SONGS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(KPDH_SONGS.map((s) => s.deezerId)).size).toBe(KPDH_SONGS.length);
    expect(KPDH_SONGS.filter((s) => s.artist === 'TWICE').map((s) => s.deezerId)).toEqual([3412534541, 3412534591]);
    for (const s of KPDH_SONGS) expect(s.source, s.title).toMatch(/^https:\/\//);
  });

  it('an empty curated list matches nothing', async () => {
    const { applyPlaylistSpec } = await import('@/lib/blind-test-curated');
    const calls: Call[] = [];
    const q: Record<string, (...a: unknown[]) => unknown> = {};
    for (const k of ['eq', 'in', 'gte', 'lte']) q[k] = (...a: unknown[]) => { calls.push([k, ...a]); return q; };
    applyPlaylistSpec(q as never, { deezerIds: [] });
    expect(calls).toEqual([['in', 'deezer_track_id', [-1]]]);
  });
});

describe('the hidden-under-10 rule', () => {
  it('a themed playlist needs 10 playable songs', async () => {
    const { themedVisible, THEMED_MIN_SONGS } = await import('@/lib/blind-test-modes');
    expect(THEMED_MIN_SONGS).toBe(10);
    expect([0, 9, 10, 11].map(themedVisible)).toEqual([false, false, true, true]);
  });

  it('visibleStaticModes drops the themed modes under the floor and never a legacy mode', async () => {
    flags('1', '1');
    const { STATIC_MODES } = await import('@/lib/blind-test-modes');
    const { visibleStaticModes } = await import('@/lib/blind-test-playlists');
    const counts = { 'kpop-hits-2026': 0, 'kpop-hits-2025': 51, '5th-gen': 284, 'tiktok-viral': 26, 'kpop-demon-hunters': 9 };
    const ids = visibleStaticModes(STATIC_MODES, counts).map((m) => m.id);
    expect(ids).toHaveLength(21);
    expect(ids).not.toContain('kpop-hits-2026');
    expect(ids).not.toContain('kpop-demon-hunters');
    expect(ids).toEqual(expect.arrayContaining(['kpop-hits-2025', '5th-gen', 'tiktok-viral', 'classic', 'kpop-legends']));
    // No count at all (a failed read): every themed mode is hidden, the 18 legacy modes stay.
    expect(visibleStaticModes(STATIC_MODES, {})).toHaveLength(18);
  });

  it('the count is the pool generate reads, and a hits list is capped like its pool', async () => {
    flags('1', '1');
    songRows = Array.from({ length: 75 }, (_, i) => song(i));
    const { getPlayableStaticModes, isThemedModePlayable, themedSpec } = await import('@/lib/blind-test-playlists');
    const { V12_PLAYLISTS } = await import('@/lib/blind-test-curated');
    expect(themedSpec('5th-gen')).toEqual({ generation: '5th' });
    expect(themedSpec('tiktok-viral')).toBe(V12_PLAYLISTS['tiktok-viral']);
    expect(themedSpec('classic')).toBeNull();
    recorded.length = 0;
    expect(await getPlayableStaticModes()).toHaveLength(23);
    const kpdh = recorded.find((r) => r.table === 'songs' && r.calls.some((c) => c[0] === 'in' && c[1] === 'status' && (c[2] as string[]).length === 2));
    expect(kpdh, 'the KPDH count reads its own status too').toBeDefined();
    expect(recorded.filter((r) => r.table === 'songs')).toHaveLength(5);
    expect(await isThemedModePlayable('classic')).toBe(true);

    songRows = Array.from({ length: 9 }, (_, i) => song(i));
    vi.resetModules();
    const again = await import('@/lib/blind-test-playlists');
    expect(await again.getPlayableStaticModes()).toHaveLength(18);
    expect(await again.isThemedModePlayable('tiktok-viral')).toBe(false);
  });

  it('flag off: no themed mode, and no count query runs', async () => {
    flags('1', undefined);
    const { getPlayableStaticModes, isThemedModePlayable } = await import('@/lib/blind-test-playlists');
    recorded.length = 0;
    expect(await getPlayableStaticModes()).toHaveLength(18);
    expect(await isThemedModePlayable('tiktok-viral')).toBe(false);
    expect(recorded).toHaveLength(0);
  });
});

describe('mode pages (lib/ux-v1/p6/modes.ts)', () => {
  it('flag on: decision 33\'s year and generation + gender modes and the themed modes play as named', async () => {
    flags('1', '1');
    const { modeRun } = await import('@/lib/ux-v1/p6/modes');
    const { isFixedPlaylist, playlistLabel } = await import('@/lib/ux-v1/p6/playlists');
    const { v12Playlist } = await import('@/lib/blind-test-curated');
    for (const id of ['recent-hits', '4th-gen-gg', '4th-gen-bg', 'kpop-hits-2026', 'kpop-hits-2025', 'tiktok-viral', 'kpop-demon-hunters']) {
      const run = modeRun(id)!;
      expect(run, id).toMatchObject({ exact: true, count: 10 });
      expect(run.pick.playlist, id).toBe(id);
      expect(v12Playlist(id), `${id} is served by generate`).not.toBeNull();
      expect(isFixedPlaylist(id), id).toBe(true);
      expect(playlistLabel(id), id).toBe(run.pick.label);
    }
    expect(modeRun('5th-gen')).toEqual({ pick: { playlist: '5th-gen', label: '5th gen' }, count: 10, exact: true });
    // Still the closest playlist (see the list in modes.ts and reports/G2.md).
    for (const id of ['intro-challenge', 'verse-only', 'bridge-or-break', 'speed-round', 'b-sides', 'title-tracks', 'kpop-legends']) expect(modeRun(id)!.exact, id).toBe(false);
    for (const id of ['classic', '2nd-gen', 'girl-groups', 'random-all']) expect(modeRun(id)!.exact, id).toBe(true);
  });

  it('flag off: the v11 runs, and the v12 playlist ids are not accepted', async () => {
    flags('1', undefined);
    const { modeRun } = await import('@/lib/ux-v1/p6/modes');
    const { isFixedPlaylist, playlistLabel, V12_MIXES } = await import('@/lib/ux-v1/p6/playlists');
    expect(V12_MIXES).toEqual([]);
    expect(modeRun('recent-hits')).toEqual({ pick: { playlist: 'all', label: 'All K-pop' }, count: 10, exact: false });
    expect(modeRun('4th-gen-gg')!.pick).toEqual({ playlist: '4th-gen', label: '4th gen' });
    for (const id of ['kpop-hits-2026', 'kpop-hits-2025', '5th-gen', 'tiktok-viral', 'kpop-demon-hunters']) expect(modeRun(id), id).toBeNull();
    expect(isFixedPlaylist('tiktok-viral')).toBe(false);
    expect(playlistLabel('tiktok-viral')).toBeNull();
  });
});
