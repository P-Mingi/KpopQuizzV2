// Test fixtures for the ranked UI (imported by *.test.ts and e2e/ux-v1/p7.spec.ts
// only, never by app code). They are ENGINE OUTPUTS: the prototype's sample season
// (Gold I, 8,290, #412 of 18,204, best 5 = 1,910 / 1,780 / 1,640 / 1,540 / 1,420, 12
// of 15 runs left) pushed through the real seasonCard() / ladderView() / applyRun()
// and the run state machine, so a render test or an e2e stub shows exactly what the
// engine would answer for that season. Names and scores of other fans are the
// prototype's sample handles, used in tests only.

import { answerRound, finalizeRun, newRun, startRound } from './run';
import { applyRun } from './season';
import { buildRounds, seededRng } from './select';
import { ladderView, seasonCard } from './service';
import { makePool } from './test-pool';
import { ladderViewFrom } from './view';

import type { PublicRound, RoundReveal, RunState } from './run';
import type { FinishedRun, Season } from './season';
import type { CreateRunResult, IssuedRun, RankedStore, SeasonCard, SubmittedRun } from './service';
import type { LadderDbRow, LadderScope, LadderView } from './view';

const DAY = 86_400_000;

/** Season 3, 19 days left at `now` (the prototype's "Season 3 · ends in 19 days"). */
export function sampleSeason(now: Date): Season {
  return {
    id: 3,
    startsAt: new Date(now.getTime() - 37 * DAY).toISOString(),
    endsAt: new Date(now.getTime() + 19 * DAY - 3_600_000).toISOString(),
  };
}

function run(id: string, points: number, daysAgo: number, now: Date, avgAnswerMs = 2_100): FinishedRun {
  return { id, points, correct: 8, avgAnswerMs, finishedAt: new Date(now.getTime() - daysAgo * DAY).toISOString() };
}

/** The prototype player's finished runs: best 5 = 8,290 (lowest 1,420) + two that did not count. */
export function sampleRuns(now: Date): FinishedRun[] {
  return [
    run('r1', 1_540, 9, now), run('r2', 1_910, 8, now), run('r3', 1_210, 7, now), run('r4', 1_420, 6, now),
    run('r5', 1_780, 5, now), run('r6', 980, 4, now), run('r7', 1_640, 3, now),
  ];
}

const FANS: Array<[string, number, number, string | null, string | null, string]> = [
  ['kwangya_notes', 13_240, 1_400, 'purple', 'mono', 'Karina'],
  ['hobi_sunshine', 12_880, 1_500, 'amber', null, 'j-hope'],
  ['stay4life', 11_910, 1_600, 'teal', null, 'Felix'],
  ['blink_edits', 11_240, 1_600, 'pink', 'serif', 'Lisa'],
  ['carat_diary', 10_620, 1_700, 'blue', null, 'Hoshi'],
  ['purple_ink', 10_110, 1_700, 'purple', 'serif', 'V'],
  ['once_upon', 9_640, 1_800, 'coral', null, 'Nayeon'],
  ['jk_golden', 8_720, 1_900, null, null, 'Jungkook'],
];
/** Which sample fans are in a personal scope (global positions, 1-based). */
const SCOPE_FANS: Record<LadderScope, number[]> = { global: [1, 2, 3, 4, 5, 6, 7, 8], fandom: [3, 6], following: [1, 4] };

/**
 * The prototype ladder as ranked_ladder() rows: Global = the 8 fans + "mingi" at #412
 * of 18,204; My fandom / Following = a few of them and mingi, ranked inside the scope.
 * `withMe` false = a guest (no own row, like p_user null in SQL).
 */
export function sampleLadderRows(scope: LadderScope = 'global', withMe = true): LadderDbRow[] {
  const picked = SCOPE_FANS[scope];
  const total = scope === 'global' ? 18_204 : picked.length + 1;
  const rows: LadderDbRow[] = picked.map((pos, i) => {
    const [u, score, avg, accent, font, bias] = FANS[pos - 1]!;
    return {
      position: pos, scope_position: i + 1, scope_total: total, season_score: score, avg_answer_ms: avg, runs_total: 9,
      is_me: false, legend: false, username: u, display_name: null, avatar_url: null, name_accent: accent, name_font: font, bias,
    };
  });
  if (withMe) {
    rows.push({
      position: 412, scope_position: scope === 'global' ? 412 : picked.length + 1, scope_total: total, season_score: 8_290, avg_answer_ms: 2_100, runs_total: 7,
      is_me: true, legend: false, username: 'mingi', display_name: null, avatar_url: null, name_accent: null, name_font: null, bias: null,
    });
  }
  return rows;
}

/**
 * A store holding the sample season, for the read side of the engine (seasonCard,
 * ladderView). The write side of a ranked run is simulated by `FixtureRunServer`.
 */
export class SampleStore implements RankedStore {
  constructor(private readonly now: Date, private readonly opts: { runs?: FinishedRun[]; startedToday?: number; fandom?: string | null } = {}) {}
  async seasons(): Promise<Season[]> { return [sampleSeason(this.now)]; }
  async songPool() { return makePool(); }
  async freshPreview() { return { previewUrl: null, cover: null }; }
  async openRuns(): Promise<RunState[]> { return []; }
  async startedSince(): Promise<number> { return this.opts.startedToday ?? 3; }
  async createRun(): Promise<CreateRunResult> { return { outcome: 'limit', token: null, startedToday: this.opts.startedToday ?? 3, expiresAt: null }; }
  async getRun(): Promise<RunState | null> { return null; }
  async saveRun(): Promise<boolean> { return false; }
  async finalizeRun(): Promise<boolean> { return false; }
  async finishedRuns(): Promise<FinishedRun[]> { return this.opts.runs ?? sampleRuns(this.now); }
  async standing(): Promise<{ position: number | null; total: number }> {
    const n = (this.opts.runs ?? sampleRuns(this.now)).length;
    return n >= 5 ? { position: 412, total: 18_204 } : { position: null, total: 18_204 };
  }
  async isLegend(): Promise<boolean> { return false; }
  async ladder(_season: number, scope: LadderScope, userId: string | null): Promise<LadderDbRow[]> { return sampleLadderRows(scope, userId !== null); }
  async mainFandom(): Promise<string | null> { return this.opts.fandom === undefined ? 'stray-kids' : this.opts.fandom; }
  async expiredOpenRuns(): Promise<RunState[]> { return []; }
  async nightly(): Promise<unknown> { return null; }
}

/** GET /api/ranked/me for the sample player (signed in) or a guest. */
export async function sampleCard(now: Date, who: 'player' | 'guest' | 'placing' | 'limit' = 'player'): Promise<SeasonCard> {
  const runs = who === 'placing' ? sampleRuns(now).slice(0, 3) : undefined;
  const store = new SampleStore(now, { ...(runs ? { runs } : {}), startedToday: who === 'limit' ? 15 : 3 });
  return seasonCard(store, who === 'guest' ? null : 'sample-player', sampleSeason(now), now);
}

/** GET /api/ranked/ladder?scope= for the sample player (or a guest). */
export async function sampleLadder(now: Date, scope: LadderScope, who: 'player' | 'guest' = 'player', fandom: string | null = 'stray-kids'): Promise<LadderView> {
  const store = new SampleStore(now, { fandom });
  return ladderView(store, sampleSeason(now), scope, who === 'guest' ? null : 'sample-player');
}

/** The ladder straight from rows (render tests). */
export function sampleLadderView(scope: LadderScope = 'global'): LadderView {
  return ladderViewFrom(3, scope, sampleLadderRows(scope));
}

/**
 * The server side of one ranked run for e2e stubs: the real state machine
 * (newRun / startRound / answerRound / finalizeRun) and the real season impact,
 * on a seeded draw from the synthetic pool, against the sample season. Timing is
 * validated on the test process clock, like the server does on its own.
 */
export class FixtureRunServer {
  state: RunState | null = null;
  readonly calls: Array<{ path: string; body: unknown }> = [];
  constructor(private readonly now: () => Date, private readonly seed = 7) {}

  issue(): IssuedRun {
    const t = this.now();
    this.state = newRun({ token: '11111111-2222-4333-8444-555555555555', userId: 'sample-player', season: 3, rounds: buildRounds(makePool(), seededRng(this.seed)), now: t });
    return { token: this.state.token, season: { id: 3, endsAt: sampleSeason(t).endsAt }, rounds: 10, roundMs: 10_000, expiresAt: this.state.expiresAt, runsToday: 4, runsLeft: 11 };
  }

  /** The correct option index of round i (tests pick right or wrong on purpose). */
  correctIndex(i: number): number {
    return this.state?.rounds[i]?.correctIndex ?? 0;
  }

  start(round: number): PublicRound | { error: string } {
    if (!this.state) return { error: 'run_not_found' };
    const t = startRound(this.state, round, this.now());
    if (!t.ok) return { error: t.error };
    this.state = t.state;
    return t.value;
  }

  answer(round: number, choice: number | null, clientMs: number | null): RoundReveal | { error: string } {
    if (!this.state) return { error: 'run_not_found' };
    const t = answerRound(this.state, round, choice, clientMs, this.now());
    if (!t.ok) return { error: t.error };
    this.state = t.state;
    return t.value;
  }

  submit(): SubmittedRun | { error: string } {
    if (!this.state) return { error: 'run_not_found' };
    const t = finalizeRun(this.state, this.now());
    if (!t.ok) return { error: t.error };
    this.state = t.state;
    const now = this.now();
    const { score } = t.value;
    const previous = sampleRuns(now);
    const impact = applyRun(previous, { id: this.state.token, points: score.points, correct: score.correct, avgAnswerMs: score.avgAnswerMs, finishedAt: now.toISOString() });
    return {
      status: t.value.status,
      points: score.points,
      correct: score.correct,
      total: this.state.rounds.length,
      bestCombo: score.bestCombo,
      avgAnswerMs: score.avgAnswerMs,
      songs: this.state.rounds.map((r, i) => {
        const a = this.state!.answers[i];
        return {
          round: i, kind: r.kind, song: r.reveal, correct: a?.correct === true, timedOut: a?.timedOut === true,
          answered: a?.answeredAt !== undefined, points: score.rounds[i]?.points ?? 0,
          effectiveMs: a && !a.timedOut && a.effectiveMs !== undefined ? a.effectiveMs : null,
        };
      }),
      impact,
      ladder: { before: 412, after: impact.after.score > impact.before.score ? 398 : 412, total: 18_204 },
    };
  }
}
