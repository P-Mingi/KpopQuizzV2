import { describe, expect, it } from 'vitest';

import { KPDH_DEEZER_IDS } from '@/lib/blind-test-curated';

import { seededRng } from './select';
import { issueRun } from './service';
import { makePool } from './test-pool';

import type { PoolSong, PrivateRound } from './select';
import type { CreateRunResult, RankedStore } from './service';

// Mission U, part C. A ranked run never carries the cover of a soundtrack song (drama, film, series
// OST, by album name), from the pool or from the Deezer re-fetch, nor of a song whose manual switch
// (PoolSong.hideCover, from songs.hide_cover) is on. KPDH songs stay hidden as before; every other
// round keeps its cover exactly as before. The album names are real catalogue names.

const SEASON = { id: 3, startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-27T00:00:00.000Z' };

const OST_ALBUMS = [
  'Our Beloved Summer (Original Television Soundtrack), Pt. 5',
  'Perfect Crown OST Part.4',
  'Boyfriend on Demand Part 2 (Soundtrack from the Netflix Series)',
  'Messy (From F1® The Movie)',
];
const TRAPS = ['Drama - The 4th Mini Album', 'LOST', 'Lost and Found', 'nostalgia', 'Ghost', 'OST'];

/** Acts cycle through: soundtrack album, trap album, KPDH id, manual switch, ordinary. */
type Kind = 'ost' | 'trap' | 'kpdh' | 'switch' | 'plain';
function pool(): { songs: PoolSong[]; kind: Map<string, Kind> } {
  const kind = new Map<string, Kind>();
  const songs = makePool().map((s, i): PoolSong => {
    const act = Math.floor(i / 4);
    const k: Kind = (['ost', 'trap', 'kpdh', 'switch', 'plain'] as const)[act % 5]!;
    kind.set(s.id, k);
    if (k === 'ost') return { ...s, album: OST_ALBUMS[i % OST_ALBUMS.length]! };
    if (k === 'trap') return { ...s, album: TRAPS[i % TRAPS.length]! };
    if (k === 'kpdh') return { ...s, deezerTrackId: KPDH_DEEZER_IDS[i % KPDH_DEEZER_IDS.length]! };
    if (k === 'switch') return { ...s, hideCover: true };
    return { ...s, hideCover: false };
  });
  return { songs, kind };
}

function store(songs: PoolSong[], deezer: 'answers' | 'fails'): { s: RankedStore; created: () => PrivateRound[] } {
  let rounds: PrivateRound[] = [];
  const s = {
    seasons: async () => [SEASON],
    songPool: async () => songs,
    freshPreview: async (id: number) => {
      if (deezer === 'fails') throw new Error('offline');
      return { previewUrl: `https://fresh.example/${id}.mp3`, cover: `https://fresh.example/cover-${id}.jpg` };
    },
    openRuns: async () => [],
    startedSince: async () => 0,
    createRun: async (input: { rounds: PrivateRound[] }): Promise<CreateRunResult> => {
      rounds = input.rounds;
      return { outcome: 'ok', token: '00000000-0000-4000-9000-000000000001', startedToday: 1, expiresAt: '2026-10-08T10:00:00.000Z' };
    },
  } as unknown as RankedStore;
  return { s, created: () => rounds };
}

describe('ranked: the soundtrack cover rule', () => {
  for (const deezer of ['answers', 'fails'] as const) {
    it(`no OST, KPDH or switched-on cover in a run, every other cover kept (Deezer ${deezer})`, async () => {
      const { songs, kind } = pool();
      const byId = new Map(songs.map((p) => [p.id, p]));
      const seen: Record<Kind, number> = { ost: 0, trap: 0, kpdh: 0, switch: 0, plain: 0 };
      for (let seed = 1; seed <= 12; seed++) {
        const { s, created } = store(songs, deezer);
        await issueRun(s, 'u1', SEASON, new Date('2026-10-08T09:00:00.000Z'), seededRng(seed));
        for (const r of created()) {
          const song = byId.get(r.songId)!;
          const k = kind.get(r.songId)!;
          seen[k] += 1;
          if (k === 'ost' || k === 'kpdh' || k === 'switch') expect(r.reveal.cover, `${k} ${song.album}`).toBeNull();
          else expect(r.reveal.cover, `${k} ${song.album}`).toBe(deezer === 'answers' ? `https://fresh.example/cover-${song.deezerTrackId}.jpg` : song.cover);
          // The album name is still revealed.
          expect(r.reveal.album).toBe(song.album);
        }
      }
      for (const k of Object.keys(seen) as Kind[]) expect(seen[k], k).toBeGreaterThan(0);
    });
  }
});
