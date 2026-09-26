// The ranked run state machine. Pure: every transition takes the stored run and
// the server clock and returns the next stored run, or a refusal. The DB layer
// persists the result with an optimistic `step` check, so two requests racing on
// the same token cannot both win.
//
//   issued --start(0)--> round 0 open --answer(0)--> round 0 closed --start(1)--> ...
//   issued --submit--> submitted (all 10 answered) | quit (anything less)
//
// Single use: once a run is submitted or quit, every call on its token is refused
// ('run_finished'), so a token cannot be replayed. A round can be started once
// and answered once, in order; the correct option and the song are only released
// by the answer.

import { ROUND_COUNT, ROUND_MS, RUN_TTL_MS } from './constants';
import { scoreRun } from './scoring';
import { validateAnswerTiming } from './timing';

import type { PrivateRound, RoundKind } from './select';
import type { RoundOutcome, RunScore } from './scoring';
import type { TimingRejection } from './timing';

export type RunStatus = 'issued' | 'submitted' | 'quit';

export interface StoredAnswer {
  /** Server time the round was released (ISO). */
  startedAt: string;
  /** Server time the answer arrived (ISO); absent while the round is open. */
  answeredAt?: string;
  choice?: number | null;
  clientMs?: number | null;
  effectiveMs?: number;
  timedOut?: boolean;
  correct?: boolean;
}

export interface RunState {
  token: string;
  userId: string;
  season: number;
  status: RunStatus;
  rounds: PrivateRound[];
  answers: StoredAnswer[];
  /** Optimistic concurrency counter, +1 per transition. */
  step: number;
  issuedAt: string;
  expiresAt: string;
}

export type RunRefusal =
  | 'run_finished'
  | 'run_expired'
  | 'out_of_order'
  | 'round_open'
  | 'not_started'
  | 'already_answered'
  | 'invalid_choice'
  | TimingRejection;

export type Transition<T> = { ok: true; state: RunState; value: T } | { ok: false; error: RunRefusal };

export interface PublicRound {
  round: number;
  of: number;
  kind: RoundKind;
  prompt: string;
  choices: string[];
  previewUrl: string;
  roundMs: number;
}

export interface RoundReveal {
  round: number;
  correct: boolean;
  timedOut: boolean;
  choice: number | null;
  correctIndex: number;
  effectiveMs: number | null;
  points: number;
  speedBonus: number;
  comboTenths: number;
  streak: number;
  totalPoints: number;
  song: PrivateRound['reveal'];
  last: boolean;
}

export const ROUND_PROMPT: Record<RoundKind, string> = {
  song: 'Which song is this?',
  artist: 'Who sings this?',
};

export function newRun(input: { token: string; userId: string; season: number; rounds: PrivateRound[]; now: Date }): RunState {
  return {
    token: input.token,
    userId: input.userId,
    season: input.season,
    status: 'issued',
    rounds: input.rounds,
    answers: [],
    step: 0,
    issuedAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + RUN_TTL_MS).toISOString(),
  };
}

export function isExpired(state: RunState, now: Date): boolean {
  return now.getTime() >= Date.parse(state.expiresAt);
}

function openRound(state: RunState): number | null {
  const last = state.answers[state.answers.length - 1];
  return last && last.answeredAt === undefined ? state.answers.length - 1 : null;
}

export function publicRound(state: RunState, round: number): PublicRound {
  const r = state.rounds[round];
  if (!r) throw new RangeError(`publicRound: no round ${round}`);
  return {
    round,
    of: state.rounds.length,
    kind: r.kind,
    prompt: ROUND_PROMPT[r.kind],
    choices: [...r.choices],
    previewUrl: r.previewUrl,
    roundMs: ROUND_MS,
  };
}

/** Release round `round` and stamp the server clip start. */
export function startRound(state: RunState, round: number, now: Date): Transition<PublicRound> {
  if (state.status !== 'issued') return { ok: false, error: 'run_finished' };
  if (isExpired(state, now)) return { ok: false, error: 'run_expired' };
  if (openRound(state) !== null) return { ok: false, error: 'round_open' };
  if (!Number.isInteger(round) || round !== state.answers.length || round >= state.rounds.length) {
    return { ok: false, error: 'out_of_order' };
  }
  const next: RunState = {
    ...state,
    answers: [...state.answers, { startedAt: now.toISOString() }],
    step: state.step + 1,
  };
  return { ok: true, state: next, value: publicRound(next, round) };
}

/** Map stored answers to scoring outcomes. An open round counts as a timeout. */
export function outcomesOf(state: RunState): RoundOutcome[] {
  return state.answers.map((a): RoundOutcome => {
    if (a.answeredAt === undefined || a.timedOut) return { kind: 'timeout' };
    if (a.correct) return { kind: 'right', ms: a.effectiveMs ?? ROUND_MS };
    return { kind: 'wrong', ms: a.effectiveMs ?? ROUND_MS };
  });
}

/** Lock the answer of the open round, then reveal it. */
export function answerRound(
  state: RunState,
  round: number,
  choice: number | null,
  clientMs: number | null,
  now: Date,
): Transition<RoundReveal> {
  if (state.status !== 'issued') return { ok: false, error: 'run_finished' };
  if (isExpired(state, now)) return { ok: false, error: 'run_expired' };
  const open = openRound(state);
  if (!Number.isInteger(round) || round < 0 || round >= state.rounds.length) return { ok: false, error: 'out_of_order' };
  if (open === null || round !== open) {
    return { ok: false, error: round < state.answers.length ? 'already_answered' : 'not_started' };
  }
  const r = state.rounds[round]!;
  if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice >= r.choices.length)) {
    return { ok: false, error: 'invalid_choice' };
  }
  const started = state.answers[round]!;
  const verdict = validateAnswerTiming({ choice, clientMs, serverElapsedMs: now.getTime() - Date.parse(started.startedAt) });
  if (!verdict.ok) return { ok: false, error: verdict.reason };

  const correct = !verdict.timedOut && choice === r.correctIndex;
  const stored: StoredAnswer = {
    ...started,
    answeredAt: now.toISOString(),
    choice,
    clientMs: choice === null ? null : clientMs === null ? null : Math.round(clientMs),
    effectiveMs: verdict.effectiveMs,
    timedOut: verdict.timedOut,
    correct,
  };
  const answers = [...state.answers];
  answers[round] = stored;
  const next: RunState = { ...state, answers, step: state.step + 1 };
  const score = scoreRun(outcomesOf(next), next.rounds.length);
  const scored = score.rounds[round]!;
  return {
    ok: true,
    state: next,
    value: {
      round,
      correct,
      timedOut: verdict.timedOut,
      choice,
      correctIndex: r.correctIndex,
      effectiveMs: verdict.timedOut ? null : verdict.effectiveMs,
      points: scored.points,
      speedBonus: scored.speedBonus,
      comboTenths: scored.comboTenths,
      streak: scored.streak,
      totalPoints: score.points,
      song: r.reveal,
      last: round === next.rounds.length - 1,
    },
  };
}

export interface FinalRun {
  status: Exclude<RunStatus, 'issued'>;
  score: RunScore;
  /** Per answered round, for the song accuracy stats (unanswered rounds excluded). */
  songResults: Array<{ songId: string; correct: boolean }>;
}

/**
 * Close the run (submit, quit, or expiry). All 10 rounds answered = submitted;
 * anything less = quit, recorded with the answered songs, the rest scoring 0.
 */
export function finalizeRun(state: RunState, now: Date): Transition<FinalRun> {
  if (state.status !== 'issued') return { ok: false, error: 'run_finished' };
  // An open round is closed as a timeout at the server clock.
  const answers = state.answers.map((a) =>
    a.answeredAt === undefined
      ? { ...a, answeredAt: now.toISOString(), choice: null, clientMs: null, effectiveMs: ROUND_MS, timedOut: true, correct: false }
      : a,
  );
  const complete = answers.length === state.rounds.length && state.rounds.length === ROUND_COUNT;
  const status = complete ? 'submitted' : 'quit';
  const next: RunState = { ...state, answers, status, step: state.step + 1 };
  const score = scoreRun(outcomesOf(next), state.rounds.length);
  const songResults = answers.map((a, i) => ({ songId: state.rounds[i]!.songId, correct: a.correct === true }));
  return { ok: true, state: next, value: { status, score, songResults } };
}
