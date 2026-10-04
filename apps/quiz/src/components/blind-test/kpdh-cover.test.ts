import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { legacyGenerateBody, roundFromGenerate } from '@/lib/blind-test/legacy-round';

// F6d (COMMON rule 10: KPop Demon Hunters is text and audio only). The two players of this folder
// render only what their routes serve: the legacy mode player (blind-test-player.tsx) draws
// `song.cover` from roundFromGenerate(POST /api/blind-test/generate), the daily game
// (blindtest-game.tsx) draws `q.reveal.cover` from GET /api/daily/blindtest. This runs the real
// routes into what each player renders: no cover for a KPDH song, every other cover kept.

let songRows: Record<string, unknown>[] = [];
let dailyRow: Record<string, unknown> | null = null;

function builder(table: string): unknown {
  const answer = (): { data: unknown; error: null; count: number } =>
    table === 'songs' ? { data: songRows, error: null, count: songRows.length } : { data: null, error: null, count: 0 };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(answer());
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: table === 'daily_blindtests' ? dailyRow : null, error: null });
      if (prop === 'range') return (from: number) => Promise.resolve(from === 0 ? answer() : { data: [], error: null });
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ from: (t: string) => builder(t) }),
  createPublicReadClient: () => ({ from: (t: string) => builder(t) }),
  createServiceRoleClient: () => ({ rpc: () => Promise.resolve({ error: null }), from: (t: string) => builder(t) }),
}));

const fresh = (id: number, size: string): string => `https://cdn-images.dzcdn.net/images/cover/fresh-${id}/${size}.jpg`;
// The two active TWICE KPDH songs (they come up in All K-pop) and 13 others.
const KPDH_PICK = [3412534541, 3412534591];
const OTHER_PICK = Array.from({ length: 13 }, (_, i) => 9000 + i);
const row = (deezer: number, i: number): Record<string, unknown> => ({
  id: `s${deezer}`, deezer_track_id: deezer, title: `Song ${i}`, artist_name: `Act ${i % 5}`, album_name: `Album ${i}`,
  album_cover_medium: `https://cdn-images.dzcdn.net/images/cover/stored-${deezer}/250x250.jpg`,
  album_cover_big: `https://cdn-images.dzcdn.net/images/cover/stored-${deezer}/500x500.jpg`,
  preview_url: 'https://cdn.example/p.mp3', gender: 'gg', generation: '4th', tier: 'popular', deezer_rank: i,
  wrong_answers_artist: ['A', 'B', 'C'], wrong_answers_title: ['X', 'Y', 'Z'],
});

beforeEach(() => {
  songRows = [...KPDH_PICK, ...OTHER_PICK].map((d, i) => row(d, i));
  dailyRow = null;
  vi.stubEnv('SONGS_IS_CURATED', 'true');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const id = Number(String(url).split('/').pop());
    return new Response(JSON.stringify({ preview: 'https://cdn.example/fresh.mp3', album: { cover_medium: fresh(id, '250x250'), cover_big: fresh(id, '500x500') } }));
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('blind-test players: the KPDH cover rule', () => {
  it('legacy mode player: a round from generate shows no KPDH cover, every other cover kept', async () => {
    const body = legacyGenerateBody('classic');
    expect(body).not.toBeNull();
    const { POST } = await import('@/app/api/blind-test/generate/route');
    const res = await POST(new Request('http://localhost/api/blind-test/generate', { method: 'POST', body: JSON.stringify({ ...body, playlist: 'all', count: 15 }) }) as never);
    expect(res.status).toBe(200);
    const round = roundFromGenerate(await res.json());
    expect(round?.songs).toHaveLength(15);
    for (const s of round!.songs) {
      const id = Number(s.song_id.slice(1));
      expect(s.cover, s.song_id).toBe(KPDH_PICK.includes(id) ? null : fresh(id, '500x500'));
    }
  });

  it('daily game: the reveal shows no KPDH cover, every other cover kept', async () => {
    songRows = songRows.slice(0, 10);
    dailyRow = { song_ids: songRows.map((r) => r.id), question_types: songRows.map(() => 'artist') };
    const { GET } = await import('@/app/api/daily/blindtest/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const { questions } = (await res.json()) as { questions: Array<{ song_id: string; reveal: { cover: string | null } }> };
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      const id = Number(q.song_id.slice(1));
      expect(q.reveal.cover, q.song_id).toBe(KPDH_PICK.includes(id) ? null : fresh(id, '500x500'));
    }
  });
});
