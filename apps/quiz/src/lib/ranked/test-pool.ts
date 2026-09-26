// Test fixture for the ranked unit tests (imported by *.test.ts only, never by app
// code). A synthetic catalog shaped like `songs`: 30 acts x 4 songs, every act
// with one song per curated tier, so each difficulty bucket spans many acts.

import type { PoolSong } from './select';

const TIER_CYCLE = ['iconic', 'medium', 'hard', 'popular'] as const;

export function makePool(acts = 30, perAct = 4): PoolSong[] {
  const songs: PoolSong[] = [];
  for (let a = 0; a < acts; a++) {
    for (let k = 0; k < perAct; k++) {
      const n = a * perAct + k;
      songs.push({
        id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        title: `Song ${a}-${k}`,
        artist: `Act ${a}`,
        album: `Album ${a}`,
        cover: `https://img.example/${n}.jpg`,
        previewUrl: `https://cdn.example/preview/${n}.mp3`,
        deezerTrackId: 1_000 + n,
        gender: a % 2 === 0 ? 'gg' : 'bg',
        generation: a % 3 === 0 ? '3rd' : '4th',
        tier: TIER_CYCLE[k % TIER_CYCLE.length]!,
        timesPlayed: 0,
        timesCorrect: 0,
      });
    }
  }
  return songs;
}
