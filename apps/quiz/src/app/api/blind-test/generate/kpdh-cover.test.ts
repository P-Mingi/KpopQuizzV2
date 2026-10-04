import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isKpdhTrack, KPDH_DEEZER_IDS, withoutKpdhCover } from '@/lib/blind-test-curated';

// F6a (AU1 I1, COMMON rule 10: KPop Demon Hunters is text and audio only). The 12 KPDH songs sit
// on the soundtrack album, whose Deezer cover is the film key art: generate answers cover null for
// them in every playlist, every flag state. Every other song keeps its cover, byte for byte.

let songRows: Record<string, unknown>[] = [];

function builder(table: string): unknown {
  const answer = (): { data: unknown; error: null; count: number } =>
    table === 'songs' ? { data: songRows, error: null, count: songRows.length } : { data: null, error: null, count: 0 };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
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

// 15 songs: 5 KPDH (the two TWICE songs and three soundtrack songs) and 10 others, every one with
// stored covers. A 15 song round selects all of them.
const KPDH_PICK = [3412534541, 3412534591, 3412534581, 3412534561, 3541756631];
const OTHER_PICK = Array.from({ length: 10 }, (_, i) => 9000 + i);
const row = (deezer: number, i: number): Record<string, unknown> => ({
  id: `s${deezer}`, deezer_track_id: deezer, title: `Song ${i}`, artist_name: `Act ${i % 5}`, album_name: `Album ${i}`,
  album_cover_medium: stored(deezer, '250x250'), album_cover_big: stored(deezer, '500x500'),
  preview_url: 'https://cdn.example/p.mp3', gender: 'gg', generation: '4th', tier: 'popular', deezer_rank: i,
});

type Q = { song_id: string; album_cover_medium: string | null; album_cover_big: string | null; reveal: { cover: string | null } };

async function generate(body: Record<string, unknown>): Promise<Q[]> {
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/blind-test/generate', { method: 'POST', body: JSON.stringify(body) }) as never);
  expect(res.status).toBe(200);
  return ((await res.json()) as { questions: Q[] }).questions;
}

function flags(v1: string, v12: string): void {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v1);
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12);
}

beforeEach(() => {
  songRows = [...KPDH_PICK, ...OTHER_PICK].map((d, i) => row(d, i));
  vi.stubEnv('SONGS_IS_CURATED', 'true');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('the KPDH cover rule', () => {
  it('isKpdhTrack knows the 12 ids, as numbers or strings, and nothing else', () => {
    expect(KPDH_DEEZER_IDS).toHaveLength(12);
    for (const id of KPDH_DEEZER_IDS) { expect(isKpdhTrack(id)).toBe(true); expect(isKpdhTrack(String(id))).toBe(true); }
    for (const id of [0, 1, 9000, 3412534542, null, undefined]) expect(isKpdhTrack(id as never)).toBe(false);
  });

  it('withoutKpdhCover drops both covers of a KPDH song and returns any other song as is', () => {
    const k = { deezer_track_id: 3412534581, album_cover_medium: 'a', album_cover_big: 'b', title: 'Golden' };
    expect(withoutKpdhCover(k)).toEqual({ deezer_track_id: 3412534581, album_cover_medium: null, album_cover_big: null, title: 'Golden' });
    expect(k.album_cover_big).toBe('b');
    const o = { deezer_track_id: 9001, album_cover_medium: 'a', album_cover_big: 'b' };
    expect(withoutKpdhCover(o)).toBe(o);
  });

  for (const [state, v1, v12] of [['both on', '1', '1'], ['v11 only', '1', ''], ['both off', '', '']] as const) {
    for (const deezer of ['answers', 'fails'] as const) {
      it(`${state}, Deezer ${deezer}: KPDH questions carry no cover, the others keep theirs`, async () => {
        flags(v1, v12);
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
          if (deezer === 'fails') throw new Error('offline');
          const id = Number(url.split('/').pop());
          return { json: async () => ({ preview: 'https://cdn.example/fresh.mp3', album: { cover_medium: fresh(id, '250x250'), cover_big: fresh(id, '500x500') } }) };
        }));
        const qs = await generate({ playlist: 'all', count: 15 });
        expect(qs).toHaveLength(15);
        const src = deezer === 'answers' ? fresh : stored;
        for (const q of qs) {
          const id = Number(q.song_id.slice(1));
          if (KPDH_PICK.includes(id)) {
            expect([q.album_cover_medium, q.album_cover_big, q.reveal.cover], q.song_id).toEqual([null, null, null]);
          } else {
            expect([q.album_cover_medium, q.album_cover_big, q.reveal.cover], q.song_id).toEqual([src(id, '250x250'), src(id, '500x500'), src(id, '500x500')]);
          }
        }
      });
    }
  }

  it('the KPDH playlist itself (flag on) answers no cover for any of its songs', async () => {
    flags('1', '1');
    songRows = KPDH_DEEZER_IDS.map((d, i) => row(d, i));
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ album: { cover_medium: 'https://x/m.jpg', cover_big: 'https://x/b.jpg' } }) })));
    const qs = await generate({ playlist: 'kpop-demon-hunters', count: 12 });
    expect(qs).toHaveLength(12);
    for (const q of qs) expect([q.album_cover_medium, q.album_cover_big, q.reveal.cover]).toEqual([null, null, null]);
  });
});
