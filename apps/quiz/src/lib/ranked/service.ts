// Ranked orchestration: issue a run, release rounds, lock answers, submit, and
// the player's season card. It only talks to a RankedStore (db.ts implements it
// on Supabase; the tests use an in-memory one), so every rule here is testable
// without a database. No write ever touches a legacy table (bt_plays, players)
// or anyone else's rows; ranked writes go to ranked_runs / ranked_plays /
// ranked_song_stats through the store, and bt_players only gets a bare row on a
// player's first finished run (PHASE0 Q2).

import { DAILY_RUN_LIMIT, ROUND_COUNT, ROUND_MS, RUN_TTL_MS } from './constants';
import { nextUtcDayStart, runsLeftToday, utcDayStart } from './limits';
import { answerRound, finalizeRun, startRound } from './run';
import { applyRun, bestRuns, currentSeason, daysLeft, placement, scoreToBeat, seasonAvgAnswerMs, seasonScore } from './season';
import { buildRounds } from './select';
import { nextStep, tierFor } from './tiers';
import { LADDER_LIMIT, ladderViewFrom } from './view';

import type { FinalRun, PublicRound, RoundReveal, RunRefusal, RunState } from './run';
import type { FinishedRun, Placement, Season, SeasonImpact } from './season';
import type { PoolSong, PrivateRound, Rng } from './select';
import type { NextStep, TierPlacement } from './tiers';
import type { LadderDbRow, LadderScope, LadderView } from './view';

// ---- errors -----------------------------------------------------------------

/** Ranked is not live: migration not applied, no season covering now, or no DB env. */
export class RankedNotLiveError extends Error {
  constructor(public readonly reason: 'migration_missing' | 'no_season' | 'no_env') {
    super(`ranked not live: ${reason}`);
    this.name = 'RankedNotLiveError';
  }
}

/** A refused request, with the HTTP status the route returns. */
export class RankedRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly extra: Record<string, unknown> = {}) {
    super(code);
    this.name = 'RankedRequestError';
  }
}

const REFUSAL_STATUS: Record<RunRefusal, number> = {
  run_finished: 409,
  run_expired: 410,
  out_of_order: 409,
  round_open: 409,
  not_started: 409,
  already_answered: 409,
  invalid_choice: 400,
  invalid_time: 422,
  too_fast: 422,
  over_round: 422,
  ahead_of_server: 422,
};

function refuse(error: RunRefusal): never {
  throw new RankedRequestError(REFUSAL_STATUS[error], error);
}

// ---- store contract -----------------------------------------------------------

export interface CreateRunResult {
  outcome: 'ok' | 'limit' | 'busy';
  token: string | null;
  startedToday: number;
  expiresAt: string | null;
}

export interface RankedStore {
  /** All seasons (tiny table). Throws RankedNotLiveError('migration_missing') when absent. */
  seasons(): Promise<Season[]>;
  /** The whole clean active pool with ranked accuracy stats merged in. */
  songPool(): Promise<PoolSong[]>;
  /** Fresh Deezer preview (stored links expire). null keeps the stored one. */
  freshPreview(deezerTrackId: number): Promise<{ previewUrl: string | null; cover: string | null }>;
  /** Runs of this player still in status 'issued'. */
  openRuns(userId: string): Promise<RunState[]>;
  /** Runs this player started since `since` (any status). */
  startedSince(userId: string, since: Date): Promise<number>;
  /** Atomic: refuses when a run is open ('busy') or the daily limit is reached ('limit'). */
  createRun(input: { userId: string; season: number; rounds: PrivateRound[]; dayStart: Date; dailyLimit: number; ttlMs: number }): Promise<CreateRunResult>;
  /** The run for this token IF it belongs to this user. */
  getRun(token: string, userId: string): Promise<RunState | null>;
  /** Persist a transition iff the stored step is still `prevStep`. */
  saveRun(next: RunState, prevStep: number): Promise<boolean>;
  /** Close the run and write ranked_plays + song stats, iff it is still 'issued'. */
  finalizeRun(next: RunState, final: FinalRun): Promise<boolean>;
  /** Finished (submitted or quit) runs of the player in the season. */
  finishedRuns(userId: string, season: number): Promise<FinishedRun[]>;
  /** Ladder position among placed players (null while placing) and ladder size. */
  standing(season: number, userId: string): Promise<{ position: number | null; total: number }>;
  isLegend(season: number, userId: string): Promise<boolean>;
  /** public.ranked_ladder(): the top `limit` of a scope plus the asking player's row. */
  ladder(season: number, scope: LadderScope, userId: string | null, limit: number): Promise<LadderDbRow[]>;
  /** The player's main fandom (first slug of profiles.ult_groups), null when none is set. */
  mainFandom(userId: string): Promise<string | null>;
  /** Issued runs past their expiry, oldest first (for the nightly job). */
  expiredOpenRuns(now: Date, limit: number): Promise<RunState[]>;
  /** Season roll-over + Legend recompute (SQL ranked_nightly()). */
  nightly(): Promise<unknown>;
}

// ---- season -----------------------------------------------------------------

export async function liveSeason(store: RankedStore, now: Date): Promise<Season> {
  const season = currentSeason(await store.seasons(), now);
  if (!season) throw new RankedNotLiveError('no_season');
  return season;
}

// ---- issue --------------------------------------------------------------------

export interface IssuedRun {
  token: string;
  season: { id: number; endsAt: string };
  rounds: number;
  roundMs: number;
  expiresAt: string;
  runsToday: number;
  runsLeft: number;
}

async function closeRun(store: RankedStore, state: RunState, now: Date): Promise<boolean> {
  const t = finalizeRun(state, now);
  if (!t.ok) return false;
  return store.finalizeRun(t.state, t.value);
}

export async function issueRun(store: RankedStore, userId: string, season: Season, now: Date, rng: Rng = Math.random): Promise<IssuedRun> {
  const dayStart = utcDayStart(now);
  const started = await store.startedSince(userId, dayStart);
  if (runsLeftToday(started) === 0) {
    throw new RankedRequestError(429, 'daily_limit', { runsToday: started, limit: DAILY_RUN_LIMIT, resetsAt: nextUtcDayStart(now).toISOString() });
  }
  // Starting a new run quits any run still open: it is recorded with the songs
  // answered so far (15.4 "a quit run is recorded"), never silently dropped.
  for (const open of await store.openRuns(userId)) await closeRun(store, open, now);

  const pool = await store.songPool();
  const rounds = buildRounds(pool, rng);
  const byId = new Map(pool.map((s) => [s.id, s]));
  const fresh = await Promise.all(
    rounds.map(async (r): Promise<PrivateRound> => {
      const song = byId.get(r.songId);
      if (!song) return r;
      try {
        const f = await store.freshPreview(song.deezerTrackId);
        return {
          ...r,
          previewUrl: f.previewUrl ?? r.previewUrl,
          reveal: { ...r.reveal, cover: f.cover ?? r.reveal.cover },
        };
      } catch {
        return r;
      }
    }),
  );

  const created = await store.createRun({ userId, season: season.id, rounds: fresh, dayStart, dailyLimit: DAILY_RUN_LIMIT, ttlMs: RUN_TTL_MS });
  if (created.outcome === 'limit') {
    throw new RankedRequestError(429, 'daily_limit', { runsToday: created.startedToday, limit: DAILY_RUN_LIMIT, resetsAt: nextUtcDayStart(now).toISOString() });
  }
  if (created.outcome === 'busy' || !created.token || !created.expiresAt) throw new RankedRequestError(409, 'run_in_progress');
  return {
    token: created.token,
    season: { id: season.id, endsAt: season.endsAt },
    rounds: ROUND_COUNT,
    roundMs: ROUND_MS,
    expiresAt: created.expiresAt,
    runsToday: created.startedToday,
    runsLeft: runsLeftToday(created.startedToday),
  };
}

// ---- rounds -------------------------------------------------------------------

async function loadRun(store: RankedStore, token: string, userId: string): Promise<RunState> {
  const state = await store.getRun(token, userId);
  if (!state) throw new RankedRequestError(404, 'run_not_found');
  return state;
}

export async function releaseRound(store: RankedStore, userId: string, token: string, round: number, now: Date): Promise<PublicRound> {
  const state = await loadRun(store, token, userId);
  const t = startRound(state, round, now);
  if (!t.ok) refuse(t.error);
  if (!(await store.saveRun(t.state, state.step))) throw new RankedRequestError(409, 'conflict');
  return t.value;
}

export async function lockAnswer(
  store: RankedStore,
  userId: string,
  token: string,
  round: number,
  choice: number | null,
  clientMs: number | null,
  now: Date,
): Promise<RoundReveal> {
  const state = await loadRun(store, token, userId);
  const t = answerRound(state, round, choice, clientMs, now);
  if (!t.ok) refuse(t.error);
  if (!(await store.saveRun(t.state, state.step))) throw new RankedRequestError(409, 'conflict');
  return t.value;
}

// ---- submit -------------------------------------------------------------------

export interface SongLine {
  round: number;
  kind: PrivateRound['kind'];
  song: PrivateRound['reveal'];
  correct: boolean;
  timedOut: boolean;
  answered: boolean;
  points: number;
  effectiveMs: number | null;
}

export interface SubmittedRun {
  status: FinalRun['status'];
  points: number;
  correct: number;
  total: number;
  bestCombo: number;
  avgAnswerMs: number | null;
  songs: SongLine[];
  impact: SeasonImpact;
  ladder: { before: number | null; after: number | null; total: number };
}

export async function submitRun(store: RankedStore, userId: string, token: string, now: Date): Promise<SubmittedRun> {
  const state = await loadRun(store, token, userId);
  const t = finalizeRun(state, now);
  if (!t.ok) refuse(t.error);
  const previous = await store.finishedRuns(userId, state.season);
  const before = await store.standing(state.season, userId);
  if (!(await store.finalizeRun(t.state, t.value))) refuse('run_finished');
  const { score } = t.value;
  const run: FinishedRun = { id: state.token, points: score.points, correct: score.correct, avgAnswerMs: score.avgAnswerMs, finishedAt: now.toISOString() };
  const impact = applyRun(previous, run);
  const after = await store.standing(state.season, userId);
  const songs: SongLine[] = t.state.rounds.map((r, i) => {
    const a = state.answers[i];
    const answered = a?.answeredAt !== undefined;
    const final = t.state.answers[i];
    return {
      round: i,
      kind: r.kind,
      song: r.reveal,
      correct: final?.correct === true,
      timedOut: final?.timedOut === true,
      answered,
      points: score.rounds[i]?.points ?? 0,
      effectiveMs: final && !final.timedOut && final.effectiveMs !== undefined ? final.effectiveMs : null,
    };
  });
  return {
    status: t.value.status,
    points: score.points,
    correct: score.correct,
    total: t.state.rounds.length,
    bestCombo: score.bestCombo,
    avgAnswerMs: score.avgAnswerMs,
    songs,
    impact,
    ladder: { before: before.position, after: after.position, total: after.total },
  };
}

// ---- season card ----------------------------------------------------------------

export interface SeasonCard {
  season: { id: number; startsAt: string; endsAt: string; daysLeft: number };
  signedIn: boolean;
  me: null | {
    score: number;
    tier: TierPlacement;
    legend: boolean;
    next: NextStep | null;
    toBeat: number | null;
    best: Array<{ id: string; points: number; finishedAt: string }>;
    placement: Placement;
    avgAnswerMs: number | null;
    runsToday: number;
    runsLeft: number;
    resetsAt: string;
    ladder: { position: number | null; total: number };
    recent: Array<{ id: string; points: number; correct: number; counted: boolean; finishedAt: string }>;
  };
}

export async function seasonCard(store: RankedStore, userId: string | null, season: Season, now: Date): Promise<SeasonCard> {
  const head = {
    season: { id: season.id, startsAt: season.startsAt, endsAt: season.endsAt, daysLeft: daysLeft(season, now) },
  };
  if (!userId) return { ...head, signedIn: false, me: null };
  const [runs, startedToday, standing, legend] = await Promise.all([
    store.finishedRuns(userId, season.id),
    store.startedSince(userId, utcDayStart(now)),
    store.standing(season.id, userId),
    store.isLegend(season.id, userId),
  ]);
  const best = bestRuns(runs);
  const bestIds = new Set(best.map((r) => r.id));
  const score = seasonScore(runs);
  const recent = [...runs]
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
    .slice(0, 10)
    .map((r) => ({ id: r.id, points: r.points, correct: r.correct, counted: bestIds.has(r.id), finishedAt: r.finishedAt }));
  return {
    ...head,
    signedIn: true,
    me: {
      score,
      tier: tierFor(score),
      legend,
      next: nextStep(score),
      toBeat: scoreToBeat(runs),
      best: best.map((r) => ({ id: r.id, points: r.points, finishedAt: r.finishedAt })),
      placement: placement(runs.length),
      avgAnswerMs: seasonAvgAnswerMs(runs),
      runsToday: startedToday,
      runsLeft: runsLeftToday(startedToday),
      resetsAt: nextUtcDayStart(now).toISOString(),
      ladder: standing,
      recent,
    },
  };
}

// ---- ladder -------------------------------------------------------------------

/**
 * The season ladder of a scope (Global / My fandom / Following). Guests only get
 * Global; "My fandom" needs a main fandom in Settings. Rows carry public profile
 * fields only (what /u/[username] shows), never a user id.
 */
export async function ladderView(store: RankedStore, season: Season, scope: LadderScope, userId: string | null, limit = LADDER_LIMIT): Promise<LadderView> {
  const empty = (needs: LadderView['needs']): LadderView => ({ season: { id: season.id }, scope, rows: [], me: null, total: 0, needs });
  if (scope !== 'global' && !userId) return empty('sign_in');
  if (scope === 'fandom' && userId && !(await store.mainFandom(userId))) return empty('fandom');
  return ladderViewFrom(season.id, scope, await store.ladder(season.id, scope, userId, limit), limit);
}

// ---- nightly ------------------------------------------------------------------

/** Close expired open runs as quit runs, then roll the season and recompute Legend. */
export async function runNightly(store: RankedStore, now: Date, batch = 500): Promise<{ closed: number; nightly: unknown }> {
  let closed = 0;
  for (const state of await store.expiredOpenRuns(now, batch)) {
    if (await closeRun(store, state, now)) closed++;
  }
  return { closed, nightly: await store.nightly() };
}
