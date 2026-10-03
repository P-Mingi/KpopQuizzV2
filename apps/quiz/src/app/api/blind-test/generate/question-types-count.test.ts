import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import baseline from './question-types-baseline.json';

// V12 (G2, request G4 R5): above 10 songs the question types array had only 10 entries, so
// songs 11 to 15 were always "Name the song". The split now covers every song, and the
// answer for 10 songs or fewer is byte for byte what it was before the fix (hashes below
// were recorded from the route at 76597a9 with the same seeded random).

const songRows = Array.from({ length: 40 }, (_, i) => ({
  id: `s${i}`, deezer_track_id: 1000 + i, title: `Song ${i}`, artist_name: `Act ${i % 6}`, album_name: null,
  album_cover_medium: null, album_cover_big: null, preview_url: 'https://cdn.example/p.mp3',
  gender: i % 2 ? 'gg' : 'bg', generation: '4th', tier: ['popular', 'medium', 'iconic', 'hard'][i % 4], deezer_rank: i,
}));

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

// mulberry32: a seeded Math.random so a run is repeatable.
function seed(n: number): void {
  let a = n >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

async function generate(body: Record<string, unknown>): Promise<{ status: number; text: string }> {
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/blind-test/generate', { method: 'POST', body: JSON.stringify(body) }) as never);
  return { status: res.status, text: await res.text() };
}

function flags(v12: boolean): void {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })));
  vi.stubEnv('SONGS_IS_CURATED', 'true');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('question types above 10 songs (G4 R5)', () => {
  it('a 15 song game keeps the group/title mix over all 15 songs, not 10', async () => {
    flags(false);
    for (let s = 1; s <= 40; s += 1) {
      seed(s);
      const { status, text } = await generate({ playlist: 'all', count: 15 });
      expect(status).toBe(200);
      const types = (JSON.parse(text) as { questions: { question_type: string }[] }).questions.map((q) => q.question_type);
      expect(types).toHaveLength(15);
      const artists = types.filter((t) => t === 'artist').length;
      // 6 of 10 (+/- 1) scaled to 15: 8 to 11 group questions.
      expect(artists, `seed ${s}: ${types.join(',')}`).toBeGreaterThanOrEqual(8);
      expect(artists, `seed ${s}`).toBeLessThanOrEqual(11);
    }
  });

  it('songs 11 to 15 are not always "Name the song"', async () => {
    flags(false);
    let tailArtists = 0;
    for (let s = 1; s <= 20; s += 1) {
      seed(s);
      const { text } = await generate({ playlist: 'all', count: 15 });
      const qs = (JSON.parse(text) as { questions: { question_type: string }[] }).questions;
      tailArtists += qs.slice(10).filter((q) => q.question_type === 'artist').length;
    }
    expect(tailArtists).toBeGreaterThan(0);
  });
});

// Recorded from the pre-fix route: sha256 of the full response text per flag, mode and count.
const BASELINE = baseline as Record<string, string>;

describe('10 songs or fewer: the answer is unchanged for every existing mode', () => {
  for (const v12 of [false, true]) {
    it(`flag ${v12 ? 'on' : 'off'}: counts 5 to 10 over every static mode`, async () => {
      flags(v12);
      const { STATIC_MODES } = await import('@/lib/blind-test-modes');
      const got: Record<string, string> = {};
      for (const m of STATIC_MODES) {
        for (let count = 5; count <= 10; count += 1) {
          seed(count * 7919 + m.id.length);
          const { status, text } = await generate({ playlist: m.id, count });
          got[`${v12 ? 'on' : 'off'}|${m.id}|${count}`] = `${status}:${createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
        }
      }
      if (process.env.RECORD_BASELINE) console.log(JSON.stringify(got));
      for (const [k, v] of Object.entries(got)) expect(v, k).toBe(BASELINE[k]);
    });
  }
});
