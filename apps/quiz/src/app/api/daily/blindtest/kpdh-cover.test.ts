import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// F6d (COMMON rule 10: KPop Demon Hunters is text and audio only). The daily blindtest answers
// cover null for the 12 KPDH songs (the film key art), after the Deezer re-fetch too. Every other
// song keeps its cover, byte for byte. Not flag-gated.

let songRows: Record<string, unknown>[] = [];

function builder(table: string): unknown {
  const answer = (): { data: unknown; error: null } =>
    table === 'songs' ? { data: songRows, error: null } : { data: null, error: null };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
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
  createServiceRoleClient: () => ({
    rpc: () => Promise.resolve({ error: null }),
    from: (t: string) => builder(t),
  }),
}));

const stored = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/stored-${id}/${size}.jpg`;
const fresh = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/fresh-${id}/${size}.jpg`;

// 10 songs: the two active TWICE KPDH songs and 8 others, all with stored covers.
const KPDH_PICK = [3412534541, 3412534591];
const OTHER_PICK = Array.from({ length: 8 }, (_, i) => 9000 + i);
const row = (deezer: number, i: number): Record<string, unknown> => ({
  id: `s${deezer}`, deezer_track_id: deezer, title: `Song ${i}`, artist_name: `Act ${i % 4}`, album_name: `Album ${i}`,
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

function deezerAnswers(): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const id = Number(String(url).split('/').pop());
    return new Response(JSON.stringify({ preview: 'https://cdn.example/fresh.mp3', album: { cover_medium: fresh(id, '250x250'), cover_big: fresh(id, '500x500') } }));
  }));
}

beforeEach(() => { songRows = [...KPDH_PICK, ...OTHER_PICK].map((d, i) => row(d, i)); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('daily blindtest: the KPDH cover rule', () => {
  for (const deezer of ['answers', 'fails'] as const) {
    it(`no KPDH cover, every other cover kept (Deezer ${deezer})`, async () => {
      if (deezer === 'answers') deezerAnswers();
      else vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
      const qs = await daily();
      expect(qs).toHaveLength(10);
      const cover = deezer === 'answers' ? fresh : stored;
      for (const q of qs) {
        const id = Number(q.song_id.slice(1));
        if (KPDH_PICK.includes(id)) {
          expect(q.album_cover_medium).toBeNull();
          expect(q.album_cover_big).toBeNull();
          expect(q.reveal.cover).toBeNull();
        } else {
          expect(q.album_cover_medium).toBe(cover(id, '250x250'));
          expect(q.album_cover_big).toBe(cover(id, '500x500'));
          expect(q.reveal.cover).toBe(cover(id, '500x500'));
        }
      }
    });
  }

  it('a day without a KPDH song is unchanged: every cover served', async () => {
    songRows = Array.from({ length: 10 }, (_, i) => row(9100 + i, i));
    deezerAnswers();
    const qs = await daily();
    expect(qs.every((q) => q.reveal.cover !== null && q.album_cover_big !== null && q.album_cover_medium !== null)).toBe(true);
  });
});
