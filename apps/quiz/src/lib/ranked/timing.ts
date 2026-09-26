// Fair-play timing (DESIGN-SPEC 15.4: "answer times are measured from the server
// clip start"). Every round has two server timestamps: when the server released
// the round (start) and when the answer reached it. The client also reports how
// long its clip had been playing. The server never trusts the client alone:
//
//   rejected (impossible):
//     - a time that is not a finite number, or negative
//     - faster than MIN_ANSWER_MS (no human names a song that fast)
//     - longer than the 10 s round (the timer ends the round at 10 s)
//     - more time than the server saw pass (+ clock jitter)
//   accepted:
//     effective = max(client time, server time - latency allowance)
//     so a client that under-reports its time gains nothing beyond the allowance,
//     and an answer that reached the server long after the clip ended is a timeout.

import { CLOCK_TOLERANCE_MS, LATENCY_ALLOWANCE_MS, MIN_ANSWER_MS, ROUND_MS } from './constants';

export type TimingRejection = 'invalid_time' | 'too_fast' | 'over_round' | 'ahead_of_server';

export type TimingVerdict =
  | { ok: true; timedOut: false; effectiveMs: number }
  | { ok: true; timedOut: true; effectiveMs: typeof ROUND_MS }
  | { ok: false; reason: TimingRejection };

export interface TimingInput {
  /** The picked option, or null when the client timer ran out. */
  choice: number | null;
  /** Client-measured ms since its clip started (ignored for a timeout). */
  clientMs: number | null;
  /** Server-measured ms between releasing the round and receiving the answer. */
  serverElapsedMs: number;
}

export function validateAnswerTiming(input: TimingInput): TimingVerdict {
  const { choice, clientMs, serverElapsedMs } = input;
  if (!Number.isFinite(serverElapsedMs) || serverElapsedMs < 0) return { ok: false, reason: 'invalid_time' };
  // A timeout is never better for the player than an answer, so it needs no proof.
  if (choice === null) return { ok: true, timedOut: true, effectiveMs: ROUND_MS };
  if (clientMs === null || !Number.isFinite(clientMs) || clientMs < 0) return { ok: false, reason: 'invalid_time' };
  const ms = Math.round(clientMs);
  if (ms < MIN_ANSWER_MS) return { ok: false, reason: 'too_fast' };
  if (ms > ROUND_MS) return { ok: false, reason: 'over_round' };
  if (ms > serverElapsedMs + CLOCK_TOLERANCE_MS) return { ok: false, reason: 'ahead_of_server' };
  const effective = Math.max(ms, Math.round(serverElapsedMs) - LATENCY_ALLOWANCE_MS);
  if (effective >= ROUND_MS) return { ok: true, timedOut: true, effectiveMs: ROUND_MS };
  return { ok: true, timedOut: false, effectiveMs: effective };
}
