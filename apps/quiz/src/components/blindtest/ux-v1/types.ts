// Shared types of the v11 blindtest game (client-safe).

/** One round as POST /api/blind-test/generate and GET /api/daily/blindtest return it. */
export interface BtQuestion {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  preview_url: string;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  correct_answer: string;
  choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

/** One answer, recorded exactly like blindtest-game.tsx does. */
export interface BtAnswer {
  picked: number | null;
  correct: boolean;
  /** ms from the clip start to the answer (or the full timer on a timeout). */
  time_ms: number;
}

export type BtMode = 'free' | 'daily';

/** idle = the hub; tap = waiting for a tap to start the audio (no user gesture yet). */
export type BtPhase = 'idle' | 'tap' | 'loading' | 'playing' | 'reveal' | 'results';
