import { describe, expect, it } from 'vitest';

import {
  accuracyDifficulty,
  artistDistractors,
  buildRounds,
  difficultyOf,
  drawRankedSongs,
  drawRoundKinds,
  RankedDrawError,
  seededRng,
  titleDistractors,
} from './select';
import { makePool } from './test-pool';

describe('difficulty: community accuracy once trusted, curated tier before', () => {
  it.each([
    ['iconic', 'easy'],
    ['popular', 'easy'],
    ['medium', 'medium'],
    ['hard', 'hard'],
    ['unknown', 'hard'],
    [null, 'medium'],
    ['something-new', 'medium'],
  ] as const)('tier %s -> %s when there are no stats', (tier, d) => {
    expect(difficultyOf({ tier, timesPlayed: 0, timesCorrect: 0 })).toBe(d);
  });

  it.each([
    [1.0, 'easy'],
    [0.7, 'easy'],
    [0.69, 'medium'],
    [0.4, 'medium'],
    [0.39, 'hard'],
    [0, 'hard'],
  ] as const)('accuracy %f -> %s', (acc, d) => {
    expect(accuracyDifficulty(acc)).toBe(d);
  });

  it('accuracy wins over the tier from 20 answers, not before', () => {
    expect(difficultyOf({ tier: 'iconic', timesPlayed: 19, timesCorrect: 1 })).toBe('easy');
    expect(difficultyOf({ tier: 'iconic', timesPlayed: 20, timesCorrect: 2 })).toBe('hard');
    expect(difficultyOf({ tier: 'hard', timesPlayed: 40, timesCorrect: 36 })).toBe('easy');
  });
});

describe('server-drawn run: 4 easy / 4 medium / 2 hard, 6 song + 4 artist rounds', () => {
  const pool = makePool();

  it.each([1, 2, 3, 42, 2026])('seed %i: exact mix, distinct acts and titles', (seed) => {
    const songs = drawRankedSongs(pool, seededRng(seed));
    expect(songs).toHaveLength(10);
    const mix = { easy: 0, medium: 0, hard: 0 };
    for (const s of songs) mix[s.difficulty]++;
    expect(mix).toEqual({ easy: 4, medium: 4, hard: 2 });
    expect(new Set(songs.map((s) => s.artist)).size).toBe(10);
    expect(new Set(songs.map((s) => s.title)).size).toBe(10);
    expect(new Set(songs.map((s) => s.id)).size).toBe(10);
  });

  it('6 song rounds and 4 artist rounds, in a random order', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const kinds = drawRoundKinds(seededRng(seed));
      expect(kinds.filter((k) => k === 'song')).toHaveLength(6);
      expect(kinds.filter((k) => k === 'artist')).toHaveLength(4);
      orders.add(kinds.join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('a bucket too small refuses the draw instead of bending the rules', () => {
    const easyOnly = pool.filter((s) => s.tier === 'iconic' || s.tier === 'popular');
    expect(() => drawRankedSongs(easyOnly, seededRng(1))).toThrow(RankedDrawError);
  });

  it('rounds: 4 options, the right one exactly once, no option repeated', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rounds = buildRounds(pool, seededRng(seed));
      expect(rounds).toHaveLength(10);
      for (const r of rounds) {
        expect(r.choices).toHaveLength(4);
        expect(new Set(r.choices.map((c) => c.toLowerCase())).size).toBe(4);
        const right = r.kind === 'artist' ? r.reveal.artist : r.reveal.title;
        expect(r.choices[r.correctIndex]).toBe(right);
        expect(r.choices.filter((c) => c === right)).toHaveLength(1);
      }
      const positions = new Set(rounds.map((r) => r.correctIndex));
      expect(positions.size).toBeGreaterThan(1);
    }
  });

  it('artist options prefer the same generation and gender', () => {
    const song = pool[0]!; // Act 0: 3rd gen, gg
    const wrong = artistDistractors(song, pool, seededRng(7));
    expect(wrong).toHaveLength(3);
    expect(wrong).not.toContain(song.artist);
    const byName = new Map(pool.map((s) => [s.artist, s]));
    for (const w of wrong) {
      expect(byName.get(w)?.generation).toBe('3rd');
      expect(byName.get(w)?.gender).toBe('gg');
    }
  });

  it('title options use the same act first', () => {
    const song = pool[0]!;
    const wrong = titleDistractors(song, pool, seededRng(7));
    expect(wrong.sort()).toEqual(['Song 0-1', 'Song 0-2', 'Song 0-3']);
  });

  it('the same seed draws the same run (reproducible for tests)', () => {
    expect(buildRounds(pool, seededRng(99))).toEqual(buildRounds(pool, seededRng(99)));
  });
});
