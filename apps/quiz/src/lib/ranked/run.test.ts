import { describe, expect, it } from 'vitest';

import { answerRound, finalizeRun, newRun, publicRound, startRound } from './run';
import { buildRounds, seededRng } from './select';
import { makePool } from './test-pool';

import type { RunState } from './run';

const T0 = new Date('2026-10-02T12:00:00.000Z');
const at = (ms: number): Date => new Date(T0.getTime() + ms);

function fresh(): RunState {
  return newRun({ token: '11111111-1111-4111-8111-111111111111', userId: 'u1', season: 1, rounds: buildRounds(makePool(), seededRng(5)), now: T0 });
}

function must<T>(t: { ok: true; state: RunState; value: T } | { ok: false; error: string }): { state: RunState; value: T } {
  if (!t.ok) throw new Error(`unexpected refusal ${t.error}`);
  return t;
}

/** Play round i: start at `startMs`, answer `choice` after `ms` (client) with the server seeing ms + 200. */
function play(state: RunState, i: number, startMs: number, choice: number | null, ms: number): RunState {
  const s = must(startRound(state, i, at(startMs))).state;
  return must(answerRound(s, i, choice, choice === null ? null : ms, at(startMs + ms + 200))).state;
}

describe('rounds are released one at a time and never leak the answer', () => {
  it('the public round carries the options but not the correct index or the song', () => {
    const r = must(startRound(fresh(), 0, at(0))).value;
    expect(Object.keys(r).sort()).toEqual(['choices', 'kind', 'of', 'previewUrl', 'prompt', 'round', 'roundMs']);
    expect(r.of).toBe(10);
    expect(r.roundMs).toBe(10_000);
    expect(['Which song is this?', 'Who sings this?']).toContain(r.prompt);
  });

  it('rounds start in order, once each, only after the previous answer', () => {
    const s0 = fresh();
    expect(startRound(s0, 1, at(0))).toEqual({ ok: false, error: 'out_of_order' });
    const s1 = must(startRound(s0, 0, at(0))).state;
    expect(startRound(s1, 0, at(100))).toEqual({ ok: false, error: 'round_open' });
    expect(startRound(s1, 1, at(100))).toEqual({ ok: false, error: 'round_open' });
    const s2 = must(answerRound(s1, 0, 0, 1_500, at(1_700))).state;
    expect(startRound(s2, 0, at(2_000))).toEqual({ ok: false, error: 'out_of_order' });
    expect(startRound(s2, 1, at(2_000)).ok).toBe(true);
  });

  it('an answer is locked once (replaying it is refused)', () => {
    const s1 = must(startRound(fresh(), 0, at(0))).state;
    const s2 = must(answerRound(s1, 0, 1, 1_500, at(1_700))).state;
    expect(answerRound(s2, 0, 0, 1_000, at(1_800))).toEqual({ ok: false, error: 'already_answered' });
    expect(answerRound(s2, 1, 0, 1_000, at(1_800))).toEqual({ ok: false, error: 'not_started' });
  });

  it('impossible timings are refused and the round stays open', () => {
    const s1 = must(startRound(fresh(), 0, at(0))).state;
    expect(answerRound(s1, 0, 0, 100, at(500))).toEqual({ ok: false, error: 'too_fast' });
    expect(answerRound(s1, 0, 0, 4_000, at(1_000))).toEqual({ ok: false, error: 'ahead_of_server' });
    expect(answerRound(s1, 0, 0, 12_000, at(12_100))).toEqual({ ok: false, error: 'over_round' });
    expect(answerRound(s1, 0, 7, 1_000, at(1_200))).toEqual({ ok: false, error: 'invalid_choice' });
    expect(answerRound(s1, 0, 0, 1_000, at(1_200)).ok).toBe(true);
  });

  it('the reveal scores with the server-checked time', () => {
    const s = fresh();
    const right = s.rounds[0]!.correctIndex;
    const s1 = must(startRound(s, 0, at(0))).state;
    // client says 1.0 s but the answer reached the server 4.0 s after the release:
    // effective = max(1000, 4000 - 1500) = 2500 -> bonus round(100 x 7.5 / 8) = 94
    const reveal = must(answerRound(s1, 0, right, 1_000, at(4_000))).value;
    expect(reveal).toMatchObject({ correct: true, effectiveMs: 2_500, speedBonus: 94, points: 194, totalPoints: 194, streak: 1 });
    expect(reveal.song.title).toBe(s.rounds[0]!.reveal.title);
  });
});

describe('the token is single use', () => {
  it('a full run submits once; every later call on the token is refused', () => {
    let s = fresh();
    for (let i = 0; i < 10; i++) s = play(s, i, i * 15_000, s.rounds[i]!.correctIndex, 1_000);
    const done = must(finalizeRun(s, at(200_000)));
    expect(done.value.status).toBe('submitted');
    expect(done.value.score.points).toBe(2_900);
    expect(finalizeRun(done.state, at(200_100))).toEqual({ ok: false, error: 'run_finished' });
    expect(startRound(done.state, 0, at(200_100))).toEqual({ ok: false, error: 'run_finished' });
    expect(answerRound(done.state, 9, 0, 1_000, at(200_100))).toEqual({ ok: false, error: 'run_finished' });
  });

  it('an expired run refuses rounds but can still be closed (recorded as quit)', () => {
    const s = play(fresh(), 0, 0, 0, 1_000);
    const late = at(16 * 60_000);
    expect(startRound(s, 1, late)).toEqual({ ok: false, error: 'run_expired' });
    const done = must(finalizeRun(s, late));
    expect(done.value.status).toBe('quit');
  });
});

describe('quit runs are recorded with the answered songs', () => {
  it('3 answered, then quit: the rest score 0; an open round counts as a timeout', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = play(s, i, i * 15_000, s.rounds[i]!.correctIndex, 1_000);
    s = must(startRound(s, 3, at(45_000))).state; // clip playing, player quits
    const done = must(finalizeRun(s, at(47_000)));
    expect(done.value.status).toBe('quit');
    expect(done.value.score.points).toBe(200 + 220 + 240);
    expect(done.value.score.correct).toBe(3);
    expect(done.value.songResults).toHaveLength(4);
    expect(done.value.songResults[3]).toEqual({ songId: s.rounds[3]!.songId, correct: false });
    expect(done.state.answers[3]).toMatchObject({ timedOut: true, choice: null });
  });

  it('a wrong pick and a timeout reset the combo', () => {
    let s = fresh();
    const wrongOf = (i: number): number => (s.rounds[i]!.correctIndex + 1) % 4;
    s = play(s, 0, 0, s.rounds[0]!.correctIndex, 1_000); // 200
    s = play(s, 1, 15_000, s.rounds[1]!.correctIndex, 1_000); // 220
    s = play(s, 2, 30_000, wrongOf(2), 1_000); // 0
    s = play(s, 3, 45_000, s.rounds[3]!.correctIndex, 1_000); // 200
    s = play(s, 4, 60_000, null, 0); // timeout
    s = play(s, 5, 75_000, s.rounds[5]!.correctIndex, 1_000); // 200
    const done = must(finalizeRun(s, at(90_000)));
    expect(done.value.score.points).toBe(820);
    expect(done.value.score.bestCombo).toBe(2);
  });

  it('publicRound refuses a round that does not exist', () => {
    expect(() => publicRound(fresh(), 10)).toThrow(RangeError);
  });
});
