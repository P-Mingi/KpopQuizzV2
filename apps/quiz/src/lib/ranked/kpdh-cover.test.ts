import { describe, expect, it } from 'vitest';

import { KPDH_DEEZER_IDS } from '@/lib/blind-test-curated';

import { seededRng } from './select';
import { issueRun } from './service';
import { makePool } from './test-pool';

import type { PoolSong, PrivateRound } from './select';
import type { CreateRunResult, RankedStore } from './service';

// F6d (COMMON rule 10: KPop Demon Hunters is text and audio only). A ranked run never carries the
// cover of a KPDH song (the film key art), from the pool or from the Deezer re-fetch. Every other
// round keeps its cover exactly as before.

const SEASON = { id: 3, startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-27T00:00:00.000Z' };

/** The synthetic pool with every even act's songs carrying a KPDH Deezer id. */
function poolWithKpdh(): PoolSong[] {
  return makePool().map((s, i) => (Math.floor(i / 4) % 2 === 0 ? { ...s, deezerTrackId: KPDH_DEEZER_IDS[i % KPDH_DEEZER_IDS.length]! } : s));
}

function store(pool: PoolSong[], deezer: 'answers' | 'fails'): { s: RankedStore; created: () => PrivateRound[] } {
  let rounds: PrivateRound[] = [];
  const s = {
    seasons: async () => [SEASON],
    songPool: async () => pool,
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

describe('ranked: the KPDH cover rule', () => {
  for (const deezer of ['answers', 'fails'] as const) {
    it(`no KPDH cover in a run, every other cover kept (Deezer ${deezer})`, async () => {
      const pool = poolWithKpdh();
      const byId = new Map(pool.map((p) => [p.id, p]));
      const kpdh = new Set<number>(KPDH_DEEZER_IDS);
      let seenKpdh = 0;
      let seenOther = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const { s, created } = store(pool, deezer);
        await issueRun(s, 'u1', SEASON, new Date('2026-10-08T09:00:00.000Z'), seededRng(seed));
        for (const r of created()) {
          const song = byId.get(r.songId)!;
          if (kpdh.has(song.deezerTrackId)) {
            seenKpdh += 1;
            expect(r.reveal.cover).toBeNull();
          } else {
            seenOther += 1;
            expect(r.reveal.cover).toBe(deezer === 'answers' ? `https://fresh.example/cover-${song.deezerTrackId}.jpg` : song.cover);
          }
        }
      }
      expect(seenKpdh).toBeGreaterThan(0);
      expect(seenOther).toBeGreaterThan(0);
    });
  }

  it('a pool without a KPDH song is unchanged: every round keeps its cover', async () => {
    const { s, created } = store(makePool(), 'answers');
    await issueRun(s, 'u1', SEASON, new Date('2026-10-08T09:00:00.000Z'), seededRng(3));
    expect(created().length).toBeGreaterThan(0);
    expect(created().every((r) => typeof r.reveal.cover === 'string')).toBe(true);
  });
});
