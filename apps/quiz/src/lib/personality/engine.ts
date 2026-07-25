// Workstream P: the personality-match engine. Pure + deterministic (same picks
// always give the same result), zero AI. A player's answers sum into a 6-axis
// vector, normalized 0-100 against the max each axis can reach across the 10
// questions, then matched to the nearest member by Euclidean distance.

export const AXIS_KEYS = ['energy', 'chaos', 'care', 'craft', 'heart', 'spotlight'] as const;
export type AxisKey = (typeof AXIS_KEYS)[number];
export type Axes = Record<AxisKey, number>;
export type Weights = Partial<Record<AxisKey, number>>;

export interface PersonalityQuestion {
  ord: number;
  question: string;
  options: { text: string; weights: Weights }[];
}

export interface PersonalityProfile {
  member_name: string;
  member_slug: string;
  photo_url: string | null;
  axes: Axes;
  trait_lines: string[];
}

export interface MemberMatch {
  profile: PersonalityProfile;
  distance: number;
  matchPct: number;
}

export interface QuizResult {
  playerAxes: Axes;
  ranked: MemberMatch[];
  top: MemberMatch;
}

// A floored cosmetic match %, so no one ever sees an insulting "12% match". The
// breakdown is still ordered by TRUE distance, not by this floored number.
export const MATCH_FLOOR = 55;
// Max possible Euclidean distance in 6-axis 0-100 space.
export const MAX_DISTANCE = Math.sqrt(AXIS_KEYS.length) * 100;

function zeroAxes(): Axes {
  return { energy: 0, chaos: 0, care: 0, craft: 0, heart: 0, spotlight: 0 };
}

/** Per-axis normalization ceiling: the most points that axis can accumulate if
 *  the player always picked that question's strongest option for it. */
export function axisMaxima(questions: PersonalityQuestion[]): Axes {
  const max = zeroAxes();
  for (const q of questions) {
    for (const k of AXIS_KEYS) {
      const best = Math.max(0, ...q.options.map((o) => o.weights[k] ?? 0));
      max[k] += best;
    }
  }
  return max;
}

/** Raw per-axis sum of the picked options (before normalization). Exposed so
 *  fixtures can assert hand-computed sums. `picks[i]` is the chosen option index
 *  for the question at index i (questions assumed in ord order). */
export function scoreRaw(questions: PersonalityQuestion[], picks: number[]): Axes {
  const sum = zeroAxes();
  questions.forEach((q, i) => {
    const pick = picks[i];
    const opt = pick === undefined ? undefined : q.options[pick];
    if (!opt) return;
    for (const k of AXIS_KEYS) sum[k] += opt.weights[k] ?? 0;
  });
  return sum;
}

/** The player's 0-100 vector: raw sums normalized per axis against the maxima. */
export function scorePlayer(questions: PersonalityQuestion[], picks: number[]): Axes {
  const sum = scoreRaw(questions, picks);
  const max = axisMaxima(questions);
  const norm = zeroAxes();
  for (const k of AXIS_KEYS) norm[k] = max[k] > 0 ? (sum[k] / max[k]) * 100 : 0;
  return norm;
}

export function distance(a: Axes, b: Axes): number {
  let s = 0;
  for (const k of AXIS_KEYS) {
    const d = a[k] - b[k];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** 100 - normalized distance, floored at MATCH_FLOOR, rounded. Cosmetic only. */
export function matchPct(dist: number): number {
  const pct = 100 - (dist / MAX_DISTANCE) * 100;
  return Math.max(MATCH_FLOOR, Math.round(pct));
}

/** Run a completed quiz: rank every member by true distance (deterministic name
 *  tiebreak) and return the winner + the full ordered breakdown. */
export function runQuiz(
  questions: PersonalityQuestion[],
  picks: number[],
  profiles: PersonalityProfile[],
): QuizResult {
  const playerAxes = scorePlayer(questions, picks);
  const ranked: MemberMatch[] = profiles
    .map((p) => {
      const d = distance(playerAxes, p.axes);
      return { profile: p, distance: d, matchPct: matchPct(d) };
    })
    .sort((a, b) => a.distance - b.distance || a.profile.member_name.localeCompare(b.profile.member_name));
  return { playerAxes, ranked, top: ranked[0]! };
}
