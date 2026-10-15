import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mission U, part C. The daily blindtest answers cover null for a soundtrack song (drama, film, series
// OST) as it does for the KPDH songs, after the Deezer re-fetch too, before and after
// songs-hide-cover.sql. Every other song keeps its cover, byte for byte. Album names and Deezer ids are
// real catalogue rows; the database is a fake (no RPC, no write reaches anything).

let songRows: Record<string, unknown>[] = [];
let switchAnswer: { data: unknown[] | null; error: { message: string; code: string } | null } = { data: [], error: null };

function builder(table: string): unknown {
  let cols = '';
  const answer = (): unknown => {
    if (table !== 'songs') return { data: null, error: null };
    return cols.includes('hide_cover') ? switchAnswer : { data: songRows, error: null };
  };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
      if (prop === 'select') return (c: string) => { cols = c; return proxy; };
      if (prop === 'range') return (from: number) => Promise.resolve(from === 0 ? answer() : { data: [], error: null });
      if (prop === 'maybeSingle') {
        return () => Promise.resolve({
          data: { song_ids: songRows.map((r) => r.id), question_types: songRows.map((_, i) => (i % 2 ? 'title' : 'artist')) },
          error: null,
        });
      }
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ rpc: () => Promise.resolve({ error: null }), from: (t: string) => builder(t) }),
  createPublicReadClient: () => ({ from: (t: string) => builder(t) }),
}));

const stored = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/stored-${id}/${size}.jpg`;
const fresh = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/fresh-${id}/${size}.jpg`;

// 10 songs: 4 soundtracks, 1 KPDH (TWICE, active), 5 others (the mission's traps among them).
const PICK: ReadonlyArray<[number, string]> = [
  [1597143482, 'Our Beloved Summer (Original Television Soundtrack), Pt. 5'],
  [2526016461, 'Drama - The 4th Mini Album'],
  [3961672791, 'Perfect Crown OST Part.4'],
  [1890800487, 'LOST'],
  [3896359941, 'Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series)'],
  [3412534591, 'KPop Demon Hunters (Soundtrack from the Netflix Film)'],
  [1603300922, 'nostalgia'],
  [3105385221, 'HWARANG, Pt. 2 (Music from the Original TV Series)'],
  [3339397501, 'Ghost'],
  [9001, 'Album 1'],
];
const HIDDEN = new Set([1597143482, 3961672791, 3896359941, 3412534591, 3105385221]);

const row = ([deezer, album]: [number, string], i: number): Record<string, unknown> => ({
  id: `s${deezer}`, deezer_track_id: deezer, title: `Song ${i}`, artist_name: `Act ${i % 4}`, album_name: album,
  album_cover_medium: stored(deezer, '250x250'), album_cover_big: stored(deezer, '500x500'),
  preview_url: 'https://cdn.example/p.mp3', gender: 'gg', generation: '4th', tier: 'popular',
  wrong_answers_artist: ['A', 'B', 'C'], wrong_answers_title: ['X', 'Y', 'Z'],
});

type Q = { song_id: string; album_cover_medium: string | null; album_cover_big: string | null; reveal: { cover: string | null } };

async function daily(): Promise<Q[]> {
  const { GET } = await import('./route');
  const res = await GET();
  expect(res.status).toBe(200);
  return ((await res.json()) as { questions: Q[] }).questions;
}

beforeEach(() => {
  songRows = PICK.map(row);
  switchAnswer = { data: [], error: null };
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('daily blindtest: the soundtrack cover rule', () => {
  for (const mode of ['answers', 'fails'] as const) {
    it(`column missing, Deezer ${mode}: no OST or KPDH cover, every other cover kept`, async () => {
      switchAnswer = { data: null, error: { message: 'column songs.hide_cover does not exist', code: '42703' } };
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (mode === 'fails') throw new Error('offline');
        const id = Number(String(url).split('/').pop());
        return new Response(JSON.stringify({ preview: 'https://cdn.example/fresh.mp3', album: { cover_medium: fresh(id, '250x250'), cover_big: fresh(id, '500x500') } }));
      }));
      const qs = await daily();
      expect(qs).toHaveLength(10);
      const src = mode === 'answers' ? fresh : stored;
      for (const q of qs) {
        const id = Number(q.song_id.slice(1));
        const expected = HIDDEN.has(id) ? [null, null, null] : [src(id, '250x250'), src(id, '500x500'), src(id, '500x500')];
        expect([q.album_cover_medium, q.album_cover_big, q.reveal.cover], q.song_id).toEqual(expected);
      }
    });
  }

  it('after the SQL: a song switched on by hand loses its cover too', async () => {
    switchAnswer = { data: [{ id: 's9001', hide_cover: true }], error: null };
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const qs = await daily();
    for (const q of qs) {
      const id = Number(q.song_id.slice(1));
      expect(q.reveal.cover === null, q.song_id).toBe(HIDDEN.has(id) || id === 9001);
    }
  });
});
