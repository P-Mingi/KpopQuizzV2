import { describe, expect, it } from 'vitest';

import { rankLadder } from './ladder';
import { newRun } from './run';
import { seasonAvgAnswerMs, seasonScore } from './season';
import { seededRng } from './select';
import {
  issueRun,
  liveSeason,
  lockAnswer,
  RankedNotLiveError,
  RankedRequestError,
  releaseRound,
  runNightly,
  seasonCard,
  submitRun,
} from './service';
import { makePool } from './test-pool';

import type { FinalRun, RunState } from './run';
import type { FinishedRun, Season } from './season';
import type { PoolSong, PrivateRound } from './select';
import type { CreateRunResult, RankedStore } from './service';

// In-memory RankedStore with the same contract as the SQL functions (one open run
// per player, 15 started per day, finalize only from 'issued', optimistic step).
class MemoryStore implements RankedStore {
  runs = new Map<string, RunState & { finishedAt?: string; final?: FinalRun }>();
  plays: Array<{ token: string; points: number }> = [];
  clock: () => Date;
  private n = 0;
  constructor(public seasonList: Season[], clock: () => Date, private pool: PoolSong[] = makePool()) {
    this.clock = clock;
  }
  async seasons(): Promise<Season[]> {
    return this.seasonList;
  }
  async songPool(): Promise<PoolSong[]> {
    return this.pool;
  }
  async freshPreview(id: number): Promise<{ previewUrl: string | null; cover: string | null }> {
    return { previewUrl: `https://fresh.example/${id}.mp3`, cover: null };
  }
  async openRuns(userId: string): Promise<RunState[]> {
    return [...this.runs.values()].filter((r) => r.userId === userId && r.status === 'issued');
  }
  async startedSince(userId: string, since: Date): Promise<number> {
    return [...this.runs.values()].filter((r) => r.userId === userId && Date.parse(r.issuedAt) >= since.getTime()).length;
  }
  async createRun(input: { userId: string; season: number; rounds: PrivateRound[]; dayStart: Date; dailyLimit: number; ttlMs: number }): Promise<CreateRunResult> {
    if ((await this.openRuns(input.userId)).length > 0) return { outcome: 'busy', token: null, startedToday: 0, expiresAt: null };
    const started = await this.startedSince(input.userId, input.dayStart);
    if (started >= input.dailyLimit) return { outcome: 'limit', token: null, startedToday: started, expiresAt: null };
    this.n += 1;
    const token = `00000000-0000-4000-9000-${String(this.n).padStart(12, '0')}`;
    const state = newRun({ token, userId: input.userId, season: input.season, rounds: input.rounds, now: this.clock() });
    this.runs.set(token, state);
    return { outcome: 'ok', token, startedToday: started + 1, expiresAt: state.expiresAt };
  }
  async getRun(token: string, userId: string): Promise<RunState | null> {
    const r = this.runs.get(token);
    return r && r.userId === userId ? structuredClone(r) : null;
  }
  async saveRun(next: RunState, prevStep: number): Promise<boolean> {
    const cur = this.runs.get(next.token);
    if (!cur || cur.status !== 'issued' || cur.step !== prevStep) return false;
    this.runs.set(next.token, structuredClone(next));
    return true;
  }
  async finalizeRun(next: RunState, final: FinalRun): Promise<boolean> {
    const cur = this.runs.get(next.token);
    if (!cur || cur.status !== 'issued' || cur.userId !== next.userId) return false;
    this.runs.set(next.token, { ...structuredClone(next), finishedAt: this.clock().toISOString(), final });
    this.plays.push({ token: next.token, points: final.score.points });
    return true;
  }
  async finishedRuns(userId: string, season: number): Promise<FinishedRun[]> {
    return [...this.runs.values()]
      .filter((r) => r.userId === userId && r.season === season && r.status !== 'issued' && r.final && r.finishedAt)
      .map((r) => ({ id: r.token, points: r.final!.score.points, correct: r.final!.score.correct, avgAnswerMs: r.final!.score.avgAnswerMs, finishedAt: r.finishedAt! }));
  }
  async standing(season: number, userId: string): Promise<{ position: number | null; total: number }> {
    const users = new Set([...this.runs.values()].map((r) => r.userId));
    const standings = await Promise.all(
      [...users].map(async (u) => {
        const runs = await this.finishedRuns(u, season);
        return { playerId: u, seasonScore: seasonScore(runs), avgAnswerMs: seasonAvgAnswerMs(runs), reachedAt: runs.at(-1)?.finishedAt ?? '1970-01-01T00:00:00Z', runs: runs.length };
      }),
    );
    const ladder = rankLadder(standings);
    return { position: ladder.find((l) => l.playerId === userId)?.position ?? null, total: ladder.length };
  }
  async isLegend(): Promise<boolean> {
    return false;
  }
  async expiredOpenRuns(now: Date): Promise<RunState[]> {
    return [...this.runs.values()].filter((r) => r.status === 'issued' && Date.parse(r.expiresAt) <= now.getTime());
  }
  nightlyCalls = 0;
  async nightly(): Promise<unknown> {
    this.nightlyCalls += 1;
    return { ok: true };
  }
}

const SEASON: Season = { id: 3, startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-27T00:00:00.000Z' };

function setup(startIso = '2026-10-08T09:00:00.000Z') {
  let now = new Date(startIso);
  const store = new MemoryStore([SEASON], () => now);
  return {
    store,
    now: () => now,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
      return now;
    },
  };
}

async function refusal(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RankedRequestError) return { status: e.status, code: e.code };
    throw e;
  }
  throw new Error('expected a refusal');
}

/** Play a whole run: every answer right after 1.2 s (server sees +300 ms). */
async function playRun(env: ReturnType<typeof setup>, user: string, rounds = 10, rightUpTo = 10) {
  const issued = await issueRun(env.store, user, SEASON, env.now(), seededRng(env.now().getTime() % 997));
  for (let i = 0; i < rounds; i++) {
    const pub = await releaseRound(env.store, user, issued.token, i, env.advance(3_000));
    const secret = env.store.runs.get(issued.token)!.rounds[i]!;
    const choice = i < rightUpTo ? secret.correctIndex : (secret.correctIndex + 1) % pub.choices.length;
    await lockAnswer(env.store, user, issued.token, i, choice, 1_200, env.advance(1_500));
  }
  return issued;
}

describe('not live', () => {
  it('no season covering now -> not_live (the route answers 503)', async () => {
    const store = new MemoryStore([SEASON], () => new Date());
    await expect(liveSeason(store, new Date('2026-12-01T00:00:00Z'))).rejects.toBeInstanceOf(RankedNotLiveError);
    await expect(liveSeason(new MemoryStore([], () => new Date()), new Date())).rejects.toMatchObject({ reason: 'no_season' });
  });
});

describe('a full ranked run through the service', () => {
  it('issue -> 10 rounds -> submit: 2,900, submitted, placement 1/5', async () => {
    const env = setup();
    const issued = await playRun(env, 'u1');
    expect(issued).toMatchObject({ rounds: 10, roundMs: 10_000, runsToday: 1, runsLeft: 14, season: { id: 3 } });
    expect(JSON.stringify(issued)).not.toContain('correctIndex');
    const res = await submitRun(env.store, 'u1', issued.token, env.advance(1_000));
    expect(res).toMatchObject({ status: 'submitted', points: 2_900, correct: 10, total: 10, bestCombo: 10, avgAnswerMs: 1_200 });
    expect(res.impact).toMatchObject({ counted: true, replaced: null, delta: 2_900, placement: { done: 1, of: 5, complete: false } });
    expect(res.songs).toHaveLength(10);
    expect(env.store.plays).toEqual([{ token: issued.token, points: 2_900 }]);
  });

  it('previews are refreshed at issue time', async () => {
    const env = setup();
    const issued = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    const pub = await releaseRound(env.store, 'u1', issued.token, 0, env.advance(100));
    expect(pub.previewUrl).toMatch(/^https:\/\/fresh\.example\//);
  });

  it('token replay is rejected: a second submit, and answering after submit', async () => {
    const env = setup();
    const issued = await playRun(env, 'u1');
    await submitRun(env.store, 'u1', issued.token, env.advance(500));
    expect(await refusal(submitRun(env.store, 'u1', issued.token, env.advance(500)))).toEqual({ status: 409, code: 'run_finished' });
    expect(await refusal(releaseRound(env.store, 'u1', issued.token, 0, env.advance(500)))).toEqual({ status: 409, code: 'run_finished' });
    expect(env.store.plays).toHaveLength(1);
  });

  it("another player's token is not found", async () => {
    const env = setup();
    const issued = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    expect(await refusal(releaseRound(env.store, 'u2', issued.token, 0, env.advance(100)))).toEqual({ status: 404, code: 'run_not_found' });
    expect(await refusal(submitRun(env.store, 'u2', issued.token, env.advance(100)))).toEqual({ status: 404, code: 'run_not_found' });
  });

  it('an impossible timing is refused with 422 and changes nothing', async () => {
    const env = setup();
    const issued = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    await releaseRound(env.store, 'u1', issued.token, 0, env.advance(100));
    const before = env.store.runs.get(issued.token)!.step;
    expect(await refusal(lockAnswer(env.store, 'u1', issued.token, 0, 0, 150, env.advance(400)))).toEqual({ status: 422, code: 'too_fast' });
    expect(await refusal(lockAnswer(env.store, 'u1', issued.token, 0, 0, 9_000, env.advance(100)))).toEqual({ status: 422, code: 'ahead_of_server' });
    expect(env.store.runs.get(issued.token)!.step).toBe(before);
  });

  it('a stale step (two tabs racing) is a 409 conflict', async () => {
    const env = setup();
    const issued = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    const stale = await env.store.getRun(issued.token, 'u1');
    await releaseRound(env.store, 'u1', issued.token, 0, env.advance(100));
    expect(await env.store.saveRun({ ...stale!, step: stale!.step + 1 }, stale!.step)).toBe(false);
  });
});

describe('15 runs a day', () => {
  it('the 16th run of the UTC day is refused, the next day is fine', async () => {
    const env = setup('2026-10-08T00:30:00.000Z');
    for (let i = 0; i < 15; i++) {
      const r = await issueRun(env.store, 'u1', SEASON, env.advance(60_000), seededRng(i + 1));
      expect(r.runsLeft).toBe(14 - i);
    }
    const refused = await refusal(issueRun(env.store, 'u1', SEASON, env.advance(60_000), seededRng(99)));
    expect(refused).toEqual({ status: 429, code: 'daily_limit' });
    // quit and abandoned runs counted: every one of the 15 was closed as a quit run
    expect([...env.store.runs.values()].filter((r) => r.status === 'quit')).toHaveLength(14);
    env.advance(24 * 3_600_000);
    await expect(issueRun(env.store, 'u1', SEASON, env.now(), seededRng(100))).resolves.toMatchObject({ runsToday: 1, runsLeft: 14 });
  });
});

describe('quit runs are recorded', () => {
  it('starting a new run closes the open one as quit, with the songs answered', async () => {
    const env = setup();
    const first = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    for (let i = 0; i < 3; i++) {
      await releaseRound(env.store, 'u1', first.token, i, env.advance(3_000));
      const secret = env.store.runs.get(first.token)!.rounds[i]!;
      await lockAnswer(env.store, 'u1', first.token, i, secret.correctIndex, 1_000, env.advance(1_200));
    }
    await issueRun(env.store, 'u1', SEASON, env.advance(5_000), seededRng(2));
    const closed = env.store.runs.get(first.token)!;
    expect(closed.status).toBe('quit');
    expect(closed.final?.score.points).toBe(660);
    expect(env.store.plays[0]).toEqual({ token: first.token, points: 660 });
  });

  it('an explicit quit (submit before the end) is recorded as quit', async () => {
    const env = setup();
    const issued = await playRun(env, 'u1', 4);
    const res = await submitRun(env.store, 'u1', issued.token, env.advance(500));
    expect(res.status).toBe('quit');
    expect(res.points).toBe(200 + 220 + 240 + 260);
    expect(res.songs.filter((s) => s.answered)).toHaveLength(4);
  });

  it('the nightly job closes expired runs as quit and runs the SQL nightly', async () => {
    const env = setup();
    const issued = await issueRun(env.store, 'u1', SEASON, env.now(), seededRng(1));
    const out = await runNightly(env.store, env.advance(20 * 60_000));
    expect(out.closed).toBe(1);
    expect(env.store.runs.get(issued.token)!.status).toBe('quit');
    expect(env.store.nightlyCalls).toBe(1);
  });
});

describe('placement and the season card', () => {
  it('first 5 runs place the player; then the ladder shows a position', async () => {
    const env = setup();
    for (let k = 0; k < 5; k++) {
      const issued = await playRun(env, 'u1', 10, 5 + k); // 5..9 right answers then misses
      const res = await submitRun(env.store, 'u1', issued.token, env.advance(1_000));
      expect(res.impact.placement).toEqual({ done: k + 1, of: 5, complete: k === 4 });
      expect(res.ladder.after).toBe(k === 4 ? 1 : null);
    }
    const card = await seasonCard(env.store, 'u1', SEASON, env.now());
    expect(card.signedIn).toBe(true);
    expect(card.me?.placement.complete).toBe(true);
    expect(card.me?.best).toHaveLength(5);
    expect(card.me?.score).toBe(card.me!.best.reduce((s, r) => s + r.points, 0));
    expect(card.me?.toBeat).toBe(card.me!.best[4]!.points);
    expect(card.me?.runsToday).toBe(5);
    expect(card.me?.runsLeft).toBe(10);
    expect(card.me?.ladder).toEqual({ position: 1, total: 1 });
    expect(card.me?.tier.label).toBeDefined();
    expect(card.season.daysLeft).toBe(19);
  });

  it('guests get the season only', async () => {
    const env = setup();
    await expect(seasonCard(env.store, null, SEASON, env.now())).resolves.toMatchObject({ signedIn: false, me: null, season: { id: 3 } });
  });
});
