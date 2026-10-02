// V12 G5: the personality engine (SYSTEM.md 5.2 and the bridge quiz of section 4).
// Pure and deterministic: the same answers always give the same result. No
// randomness, no AI, no network. Two matchers share one answer sheet:
//
//   axes   Which member are you. The answers place the player on six axes, and the
//          result is the member profile nearest to that point (personality_questions
//          and personality_profiles, read as they are).
//   tally  The KPop Demon Hunters bridge quiz. Each answer gives points to one or
//          more outcomes, the outcome with the most points wins.
//
// Nothing here prints a match percentage: the old engine showed one floored at 55,
// which is an invented number (run rule 7).

import type { UxIconName } from '@/lib/ux-v1/a0/icons';

export const AXIS_KEYS = ['energy', 'chaos', 'care', 'craft', 'heart', 'spotlight'] as const;
export type AxisKey = (typeof AXIS_KEYS)[number];
export type Axes = Record<AxisKey, number>;
export type Weights = Partial<Record<AxisKey, number>>;

/** A stored option weight is a point on a 0 to 5 scale of its axis. */
export const WEIGHT_SCALE = 5;
/** Where an axis sits when no answer spoke about it: the middle. */
export const AXIS_NEUTRAL = 50;

export interface AxisOption { text: string; weights: Weights }
export interface AxisQuestion { text: string; options: AxisOption[] }
export interface AxisProfile { id: string; name: string; axes: Axes }

export interface TallyOption { text: string; icon: UxIconName; points: Record<string, number> }
export interface TallyQuestion { text: string; options: TallyOption[] }

/** One pick per question, in order, each a valid option index. */
export function validPicks(picks: unknown, questions: ReadonlyArray<{ options: readonly unknown[] }>): picks is number[] {
  if (!Array.isArray(picks) || picks.length !== questions.length) return false;
  return picks.every((p, i) => Number.isInteger(p) && p >= 0 && p < (questions[i]?.options.length ?? 0));
}

/**
 * The player's point on the six axes, 0 to 100.
 *
 * The bank (docs/p-question-archetype-bank.md) writes every weight as a position
 * on its axis, with 0 as a real anchor ("care:0" is the caretaker end, "energy:0"
 * the quiet end). So each picked option that names an axis votes for a position
 * (weight / 5 * 100) and the axis is the mean of its votes; an axis no answer
 * named stays in the middle. The removed engine summed the weights instead, which
 * drops every 0 anchor and left four members impossible to get (measured, see the
 * G5 report).
 */
export function scorePlayer(questions: readonly AxisQuestion[], picks: readonly number[]): Axes {
  const out = {} as Axes;
  for (const k of AXIS_KEYS) {
    let sum = 0;
    let votes = 0;
    questions.forEach((q, i) => {
      const pick = picks[i];
      const w = pick === undefined ? undefined : q.options[pick]?.weights[k];
      if (typeof w !== 'number' || !Number.isFinite(w)) return;
      sum += (Math.min(WEIGHT_SCALE, Math.max(0, w)) / WEIGHT_SCALE) * 100;
      votes += 1;
    });
    out[k] = votes > 0 ? sum / votes : AXIS_NEUTRAL;
  }
  return out;
}

export function distance(a: Axes, b: Axes): number {
  let s = 0;
  for (const k of AXIS_KEYS) {
    const d = a[k] - b[k];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Profiles nearest first. Equal distances keep the profiles' own order (the stored `ord`). */
export function rankProfiles(player: Axes, profiles: readonly AxisProfile[]): Array<{ id: string; distance: number }> {
  return profiles
    .map((p, i) => ({ id: p.id, distance: distance(player, p.axes), i }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i)
    .map(({ id, distance: d }) => ({ id, distance: d }));
}

/** Which member are you: the id of the nearest profile, or null for an invalid sheet. */
export function nearestProfile(questions: readonly AxisQuestion[], picks: readonly number[], profiles: readonly AxisProfile[]): string | null {
  if (!validPicks(picks, questions) || profiles.length === 0) return null;
  return rankProfiles(scorePlayer(questions, picks), profiles)[0]?.id ?? null;
}

/** Points per outcome for a tally quiz. Unknown outcome keys are ignored. */
export function tallyScores(questions: readonly TallyQuestion[], picks: readonly number[], outcomes: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of outcomes) out[id] = 0;
  questions.forEach((q, i) => {
    const pick = picks[i];
    const opt = pick === undefined ? undefined : q.options[pick];
    if (!opt) return;
    for (const [id, pts] of Object.entries(opt.points)) {
      if (id in out && Number.isFinite(pts)) out[id] = (out[id] ?? 0) + pts;
    }
  });
  return out;
}

/** Bridge quiz: the outcome with the most points. A tie goes to the first one in `outcomes`. */
export function tallyWinner(questions: readonly TallyQuestion[], picks: readonly number[], outcomes: readonly string[]): string | null {
  if (!validPicks(picks, questions) || outcomes.length === 0) return null;
  const scores = tallyScores(questions, picks, outcomes);
  let best: string | null = null;
  let top = -Infinity;
  for (const id of outcomes) {
    const v = scores[id] ?? 0;
    if (v > top) { top = v; best = id; }
  }
  return best;
}

/** What the client needs to compute a result, and what the server recomputes from the picks. */
export type EngineSpec =
  | { kind: 'axes'; questions: AxisQuestion[]; profiles: AxisProfile[] }
  | { kind: 'tally'; questions: TallyQuestion[]; outcomes: string[] };

export function resolveResult(spec: EngineSpec, picks: readonly number[]): string | null {
  return spec.kind === 'axes'
    ? nearestProfile(spec.questions, picks, spec.profiles)
    : tallyWinner(spec.questions, picks, spec.outcomes);
}
