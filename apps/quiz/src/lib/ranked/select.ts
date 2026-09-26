// Server-drawn ranked runs (DESIGN-SPEC 15.4 + 17.6): 10 songs from the whole
// pool, 4 easy / 4 medium / 2 hard by community accuracy, 6 song rounds + 4
// artist rounds, 4 options each. Same rules for everyone: no playlist, no group.
//
// Difficulty source, in order:
//   1. community accuracy (times_correct / times_played) once a song has been
//      answered MIN_PLAYS_FOR_ACCURACY times in ranked (ranked_song_stats);
//   2. otherwise the curated `songs.tier` grade (iconic/popular = easy,
//      medium = medium, hard/unknown = hard; no tier = medium).
// Measured 2026-09-25: `songs` has no accuracy columns and 0 of the 4,120 active
// songs have per-song results anywhere (blind_test_songs stats are keyed on the
// legacy table's ids), so every draw uses (2) until ranked runs accumulate data.

import {
  ARTIST_ROUNDS,
  DIFFICULTY_MIX,
  DISTRACTORS,
  EASY_ACCURACY,
  MEDIUM_ACCURACY,
  MIN_PLAYS_FOR_ACCURACY,
  ROUND_COUNT,
  SONG_ROUNDS,
} from './constants';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type RoundKind = 'song' | 'artist';

export interface PoolSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover: string | null;
  previewUrl: string;
  deezerTrackId: number;
  gender: string | null;
  generation: string | null;
  tier: string | null;
  /** Ranked answers recorded for this song (0 when none). */
  timesPlayed: number;
  timesCorrect: number;
}

export type Rng = () => number;

/** Deterministic PRNG for tests (mulberry32). Production passes Math.random. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const TIER_DIFFICULTY: Record<string, Difficulty> = {
  iconic: 'easy',
  popular: 'easy',
  medium: 'medium',
  hard: 'hard',
  unknown: 'hard',
};

export function accuracyDifficulty(accuracy: number): Difficulty {
  if (accuracy >= EASY_ACCURACY) return 'easy';
  if (accuracy >= MEDIUM_ACCURACY) return 'medium';
  return 'hard';
}

export function difficultyOf(song: Pick<PoolSong, 'tier' | 'timesPlayed' | 'timesCorrect'>): Difficulty {
  if (song.timesPlayed >= MIN_PLAYS_FOR_ACCURACY) {
    return accuracyDifficulty(song.timesCorrect / song.timesPlayed);
  }
  return (song.tier && TIER_DIFFICULTY[song.tier]) || 'medium';
}

const norm = (s: string): string => s.trim().toLowerCase();

export class RankedDrawError extends Error {
  constructor(public readonly bucket: Difficulty, public readonly needed: number, public readonly available: number) {
    super(`ranked draw: ${bucket} needs ${needed}, pool has ${available}`);
    this.name = 'RankedDrawError';
  }
}

/**
 * Draw the 10 songs: exactly 4 easy, 4 medium, 2 hard, all by different artists
 * and with different titles, so no option in a run gives another one away.
 */
export function drawRankedSongs(pool: readonly PoolSong[], rng: Rng): Array<PoolSong & { difficulty: Difficulty }> {
  const buckets: Record<Difficulty, PoolSong[]> = { easy: [], medium: [], hard: [] };
  for (const s of pool) buckets[difficultyOf(s)].push(s);
  const usedArtists = new Set<string>();
  const usedTitles = new Set<string>();
  const picked: Array<PoolSong & { difficulty: Difficulty }> = [];
  for (const d of ['easy', 'medium', 'hard'] as const) {
    const need = DIFFICULTY_MIX[d];
    let got = 0;
    for (const s of shuffle(buckets[d], rng)) {
      if (got >= need) break;
      if (usedArtists.has(norm(s.artist)) || usedTitles.has(norm(s.title))) continue;
      usedArtists.add(norm(s.artist));
      usedTitles.add(norm(s.title));
      picked.push({ ...s, difficulty: d });
      got++;
    }
    if (got < need) throw new RankedDrawError(d, need, got);
  }
  return shuffle(picked, rng);
}

/** Exactly 6 song rounds and 4 artist rounds, in a random order. */
export function drawRoundKinds(rng: Rng): RoundKind[] {
  return shuffle<RoundKind>(
    [...Array<RoundKind>(SONG_ROUNDS).fill('song'), ...Array<RoundKind>(ARTIST_ROUNDS).fill('artist')],
    rng,
  );
}

function pickDistinct(candidates: readonly string[], exclude: string, taken: string[], rng: Rng): void {
  const seen = new Set([norm(exclude), ...taken.map(norm)]);
  for (const c of shuffle(candidates, rng)) {
    if (taken.length >= DISTRACTORS) return;
    const k = norm(c);
    if (!c.trim() || seen.has(k)) continue;
    seen.add(k);
    taken.push(c);
  }
}

/**
 * Wrong artists, all from the same pool: same generation and gender first, then
 * same generation, then same gender, then anyone, so options stay plausible.
 */
export function artistDistractors(song: PoolSong, pool: readonly PoolSong[], rng: Rng): string[] {
  const out: string[] = [];
  const passes: Array<(s: PoolSong) => boolean> = [
    (s) => s.generation === song.generation && s.gender === song.gender,
    (s) => s.generation === song.generation,
    (s) => s.gender === song.gender,
    () => true,
  ];
  for (const pass of passes) {
    if (out.length >= DISTRACTORS) break;
    pickDistinct(pool.filter(pass).map((s) => s.artist), song.artist, out, rng);
  }
  return out;
}

/** Wrong titles: the same act's other songs first (hardest), then as for artists. */
export function titleDistractors(song: PoolSong, pool: readonly PoolSong[], rng: Rng): string[] {
  const out: string[] = [];
  const passes: Array<(s: PoolSong) => boolean> = [
    (s) => norm(s.artist) === norm(song.artist),
    (s) => s.generation === song.generation && s.gender === song.gender,
    (s) => s.generation === song.generation,
    () => true,
  ];
  for (const pass of passes) {
    if (out.length >= DISTRACTORS) break;
    pickDistinct(pool.filter(pass).map((s) => s.title), song.title, out, rng);
  }
  return out;
}

/** A round as the server keeps it (never sent whole to the client). */
export interface PrivateRound {
  songId: string;
  kind: RoundKind;
  difficulty: Difficulty;
  choices: string[];
  correctIndex: number;
  previewUrl: string;
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

export function buildRounds(pool: readonly PoolSong[], rng: Rng): PrivateRound[] {
  const songs = drawRankedSongs(pool, rng);
  const kinds = drawRoundKinds(rng);
  if (songs.length !== ROUND_COUNT || kinds.length !== ROUND_COUNT) throw new Error('ranked draw: wrong round count');
  return songs.map((song, i) => {
    const kind = kinds[i]!;
    const right = kind === 'artist' ? song.artist : song.title;
    const wrong = kind === 'artist' ? artistDistractors(song, pool, rng) : titleDistractors(song, pool, rng);
    if (wrong.length < DISTRACTORS) throw new Error(`ranked draw: not enough options for song ${song.id}`);
    const choices = shuffle([right, ...wrong], rng);
    return {
      songId: song.id,
      kind,
      difficulty: song.difficulty,
      choices,
      correctIndex: choices.indexOf(right),
      previewUrl: song.previewUrl,
      reveal: { title: song.title, artist: song.artist, album: song.album, cover: song.cover },
    };
  });
}
