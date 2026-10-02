// Test doubles of the live blindtest, shared by the unit tests, the e2e spec and
// the load script's dry mode. Nothing here is imported by a page or a route: the
// production dependencies are in server.ts. No check of the V12 run may write to
// the production database, so every check plays the real service (service.ts)
// against memoryStore() with these.

import { memoryStore } from './store';

import type { LiveDeps } from './service';
import type { MemoryStore } from './store';
import type { LivePublicState } from './types';

const hex = (n: number, len: number): string => n.toString(16).padStart(len, '0');

/** A stable song id for question `i` (a valid uuid). */
export function fakeSongId(i: number): string {
  return `aaaaaaaa-0000-4000-8000-${hex(i, 12)}`;
}

export interface GeneratedQuestion {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  preview_url: string;
  correct_answer: string;
  choices: string[];
}

/**
 * `n` questions in the shape of POST /api/blind-test/generate. Titles and artists
 * are made up for tests (no catalogue read). The right answer of question i is
 * choice `i % 4`, so a script knows what to tap.
 */
export function fakeGenerated(n: number): GeneratedQuestion[] {
  return Array.from({ length: n }, (_, i) => {
    const kind = i % 2 === 0 ? 'title' : 'artist';
    const choices = [0, 1, 2, 3].map((c) => `${kind === 'title' ? 'Song' : 'Artist'} ${i + 1}${'ABCD'[c]}`);
    return {
      song_id: fakeSongId(i + 1),
      question_type: kind,
      question_text: kind === 'title' ? 'Name the song' : 'Which group is this?',
      preview_url: `https://cdnt-preview.dzcdn.net/api/1/1/test-${i + 1}.mp3`,
      correct_answer: choices[i % 4] as string,
      choices,
    };
  });
}

/** The right choice of round `round` (1-based) of fakeGenerated(). */
export function fakeCorrect(round: number): number {
  return (round - 1) % 4;
}

export interface FakeLive {
  deps: LiveDeps;
  store: MemoryStore;
  /** Every broadcast, in order. */
  sent: Array<{ topic: string; state: LivePublicState }>;
  /** Called on each broadcast (the e2e spec pushes it to its fake sockets). */
  onBroadcast: (fn: (topic: string, state: LivePublicState) => void) => void;
  /** The "database clock". */
  clock: { now: number; advance: (ms: number) => void };
}

/**
 * The service's dependencies over memory. `realTime: true` uses the wall clock
 * (e2e, load dry run); otherwise the clock only moves when a test advances it.
 */
export function fakeLive(opts: { terms?: string[]; realTime?: boolean; isTest?: boolean; start?: number } = {}): FakeLive {
  const clock = {
    now: opts.start ?? 1_790_000_000_000,
    advance(ms: number): void { clock.now += ms; },
  };
  const now = opts.realTime ? () => Date.now() : () => clock.now;
  const store = memoryStore(now);
  const sent: Array<{ topic: string; state: LivePublicState }> = [];
  const listeners: Array<(topic: string, state: LivePublicState) => void> = [];
  const deps: LiveDeps = {
    store,
    broadcast: async (topic, state) => {
      // A copy, as the wire would make one.
      const copy = JSON.parse(JSON.stringify(state)) as LivePublicState;
      sent.push({ topic, state: copy });
      for (const fn of listeners) fn(topic, copy);
    },
    bannedTerms: async () => opts.terms ?? [],
    isTest: opts.isTest ?? true,
  };
  return { deps, store, sent, onBroadcast: (fn) => { listeners.push(fn); }, clock };
}
