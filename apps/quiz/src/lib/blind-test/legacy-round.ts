// The round of the flag-off /blindtest/<mode> player, built from what
// POST /api/blind-test/generate answers today: `questions` with a Deezer preview
// each. The old player asked for `{ mode_id }` and read `songs[]` with YouTube
// ids, a shape the route stopped serving when it moved to Deezer, so every mode
// page failed on Play. Pure and tested here; the component only plays it.

import { generateBody } from '@/lib/ux-v1/p6/playlists';
import { modeRun } from '@/lib/ux-v1/p6/modes';

import type { ModeRun } from '@/lib/ux-v1/p6/modes';

export interface RoundSong {
  song_id: string;
  preview_url: string;
  question_text: string;
  choices: string[];
  correct_index: number;
  title: string;
  artist: string;
  cover: string | null;
}

export interface Round {
  /** Seconds to answer each song (the route's `timer_duration`). */
  timer: number;
  songs: RoundSong[];
}

const DEFAULT_TIMER = 10;
const MAX_TIMER = 30; // a Deezer preview is 30 seconds long

/** The run a mode page plays (playlist + count), the same one the v11 page starts. */
export function legacyModeRun(modeId: string): ModeRun | null {
  return modeRun(modeId);
}

/** The request body for a mode, or null when the id is not a mode. */
export function legacyGenerateBody(modeId: string): { playlist: string; count: number; mode: 'challenge' } | null {
  const run = modeRun(modeId);
  return run ? generateBody(run.pick, run.count) : null;
}

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Validates a generate response and maps it to a round. Returns null when it
 * holds no playable question, so the player shows an error instead of crashing.
 * A question is dropped when it has no preview, fewer than two choices, or when
 * its correct answer is not among its choices.
 */
export function roundFromGenerate(data: unknown): Round | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as { questions?: unknown; timer_duration?: unknown };
  if (!Array.isArray(body.questions)) return null;

  const songs: RoundSong[] = [];
  for (const raw of body.questions) {
    if (!raw || typeof raw !== 'object') continue;
    const q = raw as Record<string, unknown>;
    const reveal = (q.reveal && typeof q.reveal === 'object' ? q.reveal : {}) as Record<string, unknown>;
    if (!str(q.song_id) || !str(q.preview_url) || !/^https:\/\//.test(q.preview_url)) continue;
    if (!Array.isArray(q.choices) || !str(q.correct_answer)) continue;
    const choices = q.choices.filter(str);
    const correct_index = choices.indexOf(q.correct_answer);
    if (choices.length < 2 || correct_index < 0) continue;
    const cover = [reveal.cover, q.album_cover_big, q.album_cover_medium].find(str) ?? null;
    songs.push({
      song_id: q.song_id,
      preview_url: q.preview_url,
      question_text: str(q.question_text) ? q.question_text : 'Name the song',
      choices,
      correct_index,
      title: str(reveal.title) ? reveal.title : q.correct_answer,
      artist: str(reveal.artist) ? reveal.artist : '',
      cover: cover && /^https:\/\//.test(cover) ? cover : null,
    });
  }
  if (songs.length === 0) return null;

  const t = typeof body.timer_duration === 'number' && Number.isFinite(body.timer_duration) ? body.timer_duration : DEFAULT_TIMER;
  return { timer: Math.max(3, Math.min(MAX_TIMER, Math.round(t))), songs };
}
