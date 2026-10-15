import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { roundFromGenerate } from '@/lib/blind-test/legacy-round';

// Mission U, part C. Generate answers no cover for a soundtrack song (drama, film, series OST), after
// the Deezer re-fetch too, in every flag state, before and after songs-hide-cover.sql: the album name
// alone hides it. The KPDH songs stay hidden as before, every other song keeps its cover byte for byte,
// and the legacy mode player (roundFromGenerate) shows what generate answers. Once the column exists,
// a song switched on by hand (hide_cover) loses its cover too. Album names and Deezer ids are real
// catalogue rows (docs/pending-migrations/songs-hide-cover-ALBUMS.md); no server, no write.

let songRows: Record<string, unknown>[] = [];
// What the guarded read of songs.hide_cover answers (lib/song-cover-overrides.ts).
let switchAnswer: { data: unknown[] | null; error: { message: string; code: string } | null } = { data: [], error: null };
const selects: string[] = [];

function builder(table: string): unknown {
  let cols = '';
  const answer = (): unknown => {
    if (table !== 'songs') return { data: null, error: null, count: 0 };
    if (cols.includes('hide_cover')) return switchAnswer;
    return { data: songRows, error: null, count: songRows.length };
  };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
      if (prop === 'select') return (c: string) => { cols = c; selects.push(c); return proxy; };
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: null, error: null });
      if (prop === 'range') return (from: number) => Promise.resolve(from === 0 ? answer() : { data: [], error: null });
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ from: (t: string) => builder(t) }),
  createPublicReadClient: () => ({ from: (t: string) => builder(t) }),
}));

const stored = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/stored-${id}/${size}.jpg`;
const fresh = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/fresh-${id}/${size}.jpg`;

// [deezer id, album name] of real rows.
const OST: ReadonlyArray<[number, string]> = [
  [1597143482, 'Our Beloved Summer (Original Television Soundtrack), Pt. 5'],
  [3961672791, 'Perfect Crown OST Part.4'],
  [3896359941, 'Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series)'],
  [3355094441, 'Messy (From F1® The Movie)'],
  [3105385221, 'HWARANG, Pt. 2 (Music from the Original TV Series)'],
];
const KPDH: ReadonlyArray<[number, string]> = [
  [3412534541, 'KPop Demon Hunters (Soundtrack from the Netflix Film)'],
  [3412534591, 'KPop Demon Hunters (Soundtrack from the Netflix Film)'],
];
const OTHER: ReadonlyArray<[number, string]> = [
  [2526016461, 'Drama - The 4th Mini Album'],
  [1890800487, 'LOST'],
  [3677094332, 'Lost and Found'],
  [1603300922, 'nostalgia'],
  [3339397501, 'Ghost'],
  [2887742512, 'OST'],
  [9001, 'Album 1'],
  [9002, 'Album 2'],
];
const HIDDEN = new Set([...OST, ...KPDH].map(([d]) => d));

const row = ([deezer, album]: [number, string], i: number): Record<string, unknown> => ({
  id: `s${deezer}`, deezer_track_id: deezer, title: `Song ${i}`, artist_name: `Act ${i % 5}`, album_name: album,
  album_cover_medium: stored(deezer, '250x250'), album_cover_big: stored(deezer, '500x500'),
  preview_url: 'https://cdn.example/p.mp3', gender: 'gg', generation: '4th', tier: 'popular', deezer_rank: i,
});

type Q = { song_id: string; album_cover_medium: string | null; album_cover_big: string | null; reveal: { cover: string | null; album: string | null } };

async function generate(body: Record<string, unknown>): Promise<{ questions: Q[] }> {
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/blind-test/generate', { method: 'POST', body: JSON.stringify(body) }) as never);
  expect(res.status).toBe(200);
  return (await res.json()) as { questions: Q[] };
}

function deezer(mode: 'answers' | 'fails'): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (mode === 'fails') throw new Error('offline');
    const id = Number(String(url).split('/').pop());
    return { json: async () => ({ preview: 'https://cdn.example/fresh.mp3', album: { cover_medium: fresh(id, '250x250'), cover_big: fresh(id, '500x500') } }) };
  }));
}

beforeEach(() => {
  songRows = [...OST, ...KPDH, ...OTHER].map(row);
  switchAnswer = { data: [], error: null };
  selects.length = 0;
  vi.stubEnv('SONGS_IS_CURATED', 'true');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('generate: the soundtrack cover rule', () => {
  for (const [state, v1, v12] of [['both on', '1', '1'], ['v11 only', '1', ''], ['both off', '', '']] as const) {
    for (const mode of ['answers', 'fails'] as const) {
      it(`${state}, Deezer ${mode}, column missing: OST and KPDH questions carry no cover, the others keep theirs`, async () => {
        vi.stubEnv('NEXT_PUBLIC_UX_V1', v1);
        vi.stubEnv('NEXT_PUBLIC_UX_V12', v12);
        switchAnswer = { data: null, error: { message: 'column songs.hide_cover does not exist', code: '42703' } };
        deezer(mode);
        const { questions } = await generate({ playlist: 'all', count: 15 });
        expect(questions).toHaveLength(15);
        const src = mode === 'answers' ? fresh : stored;
        for (const q of questions) {
          const id = Number(q.song_id.slice(1));
          const expected = HIDDEN.has(id) ? [null, null, null] : [src(id, '250x250'), src(id, '500x500'), src(id, '500x500')];
          expect([q.album_cover_medium, q.album_cover_big, q.reveal.cover], q.song_id).toEqual(expected);
          // The album name itself is still revealed.
          expect(q.reveal.album).toBe(songRows.find((r) => r.id === q.song_id)!.album_name);
        }
      });
    }
  }

  it('after the SQL: a song switched on by hand loses its cover too; nothing else moves', async () => {
    switchAnswer = { data: [{ id: 's9001', hide_cover: true }, { id: 's9002', hide_cover: false }], error: null };
    deezer('answers');
    const { questions } = await generate({ playlist: 'all', count: 15 });
    for (const q of questions) {
      const id = Number(q.song_id.slice(1));
      expect(q.reveal.cover === null, q.song_id).toBe(HIDDEN.has(id) || id === 9001);
    }
  });

  it('the pool read never names hide_cover: only the guarded read does', async () => {
    deezer('answers');
    await generate({ playlist: 'all', count: 15 });
    const withSwitch = selects.filter((c) => c.includes('hide_cover'));
    expect(withSwitch).toEqual(['id, hide_cover']);
    expect(selects.some((c) => c.includes('album_cover_big') && !c.includes('hide_cover'))).toBe(true);
  });

  it('legacy mode player: a round from generate shows no OST or KPDH cover, every other cover kept', async () => {
    deezer('answers');
    const round = roundFromGenerate(await generate({ playlist: 'all', count: 15, mode: 'challenge' }));
    expect(round?.songs).toHaveLength(15);
    for (const s of round!.songs) {
      const id = Number(s.song_id.slice(1));
      expect(s.cover, s.song_id).toBe(HIDDEN.has(id) ? null : fresh(id, '500x500'));
    }
  });
});
