import { describe, expect, it } from 'vitest';

import { applyRun } from './season';
import {
  bestStrip,
  cardState,
  comma,
  impactView,
  ladderEntryFrom,
  ladderSub,
  ladderViewFrom,
  placementLines,
  runsLeftLine,
  seasonLine,
  secs,
  stepProgress,
  tierDisplay,
  TIER_STRIP,
} from './view';

import type { FinishedRun } from './season';
import type { SeasonCard } from './service';
import type { LadderDbRow } from './view';

let seq = 0;
const run = (points: number, day: number): FinishedRun => {
  seq += 1;
  return { id: `r${seq}`, points, correct: 8, avgAnswerMs: 2_000, finishedAt: new Date(Date.UTC(2026, 9, day)).toISOString() };
};
// The prototype's season: best 5 = 8,290 (Gold I), lowest 1,420.
const PROTO = (): FinishedRun[] => [run(1_910, 1), run(1_780, 2), run(1_640, 3), run(1_540, 4), run(1_420, 5), run(900, 6)];

describe('tier display', () => {
  it.each([
    [8_290, false, 'gold', 'Gold I', 'I'],
    [8_610, false, 'platinum', 'Platinum III', 'III'],
    [12_000, false, 'master', 'Master', null],
    [13_240, true, 'legend', 'Legend', null],
    [11_000, true, 'diamond', 'Diamond II', 'II'], // Legend needs Master
  ] as const)('%i (legend %s) -> %s %s', (score, legend, key, label, numeral) => {
    expect(tierDisplay(score, legend)).toEqual({ key, label, numeral });
  });

  it('the strip has the seven stops of 15.4', () => {
    expect(TIER_STRIP.map((t) => `${t.name} ${t.floor}`)).toEqual([
      'Bronze 0', 'Silver 4,000', 'Gold 6,500', 'Platinum 8,500', 'Diamond 10,500', 'Master 12,000', 'Legend Top 100',
    ]);
  });
});

describe('ladder rows', () => {
  const row = (over: Partial<LadderDbRow> = {}): LadderDbRow => ({
    position: '412', scope_position: '412', scope_total: '18204', season_score: 8_290, avg_answer_ms: 2_100, runs_total: 9,
    is_me: true, legend: false, username: 'mingi', display_name: null, avatar_url: null, name_accent: 'pink', name_font: 'serif', bias: 'Felix',
    ...over,
  });

  it('maps a ranked_ladder() row to what the page shows, public fields only', () => {
    const e = ladderEntryFrom(row());
    expect(e).toEqual({
      position: 412, scopePosition: 412, seasonScore: 8_290, tier: { key: 'gold', label: 'Gold I', numeral: 'I' }, avgAnswerMs: 2_100,
      me: true, name: 'mingi', username: 'mingi', avatarUrl: null, accent: 'pink', font: 'serif', bias: 'Felix',
    });
    expect(ladderSub(e)).toBe('Gold I · average 2.1s');
    expect(ladderEntryFrom(row({ display_name: 'Mingi K', username: null })).name).toBe('Mingi K');
    expect(ladderEntryFrom(row({ display_name: null, username: null })).name).toBe('Anonymous');
    expect(ladderSub(ladderEntryFrom(row({ avg_answer_ms: null })))).toBe('Gold I');
  });

  it('splits the top of the scope from your own row', () => {
    const rows = [1, 2, 3].map((i) => row({ position: i, scope_position: i, scope_total: 40, is_me: false, username: `p${i}`, season_score: 13_000 - i * 100 }));
    const v = ladderViewFrom(3, 'global', [...rows, row({ position: 40, scope_position: 40, scope_total: 40 })], 3);
    expect(v.rows.map((r) => r.name)).toEqual(['p1', 'p2', 'p3']);
    expect(v.me?.scopePosition).toBe(40);
    expect(v.total).toBe(40);
    expect(ladderViewFrom(3, 'global', [], 8)).toMatchObject({ rows: [], me: null, total: 0, needs: null });
  });
});

describe('season card', () => {
  const season = { id: 3, startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-27T00:00:00.000Z', daysLeft: 19 };

  it('state from the API answer', () => {
    expect(cardState(null, 'loading')).toEqual({ kind: 'loading' });
    expect(cardState(null, 'not_live')).toEqual({ kind: 'not_live' });
    expect(cardState(null, 'error')).toEqual({ kind: 'error' });
    expect(cardState({ season, signedIn: false, me: null }, 'live')).toEqual({ kind: 'guest', season });
    const me = { placement: { done: 3, of: 5, complete: false } } as unknown as NonNullable<SeasonCard['me']>;
    expect(cardState({ season, signedIn: true, me }, 'live').kind).toBe('placing');
    const placedMe = { placement: { done: 7, of: 5, complete: true } } as unknown as NonNullable<SeasonCard['me']>;
    expect(cardState({ season, signedIn: true, me: placedMe }, 'live').kind).toBe('placed');
  });

  it('copy lines', () => {
    expect(seasonLine(season)).toBe('Season 3 · ends in 19 days');
    expect(seasonLine({ ...season, daysLeft: 1 })).toBe('Season 3 · ends in 1 day');
    expect(seasonLine({ ...season, daysLeft: 0 })).toBe('Season 3 · ends today');
    expect(runsLeftLine(12)).toBe('12 of 15 runs left today');
    expect(runsLeftLine(1)).toBe('1 of 15 runs left today');
    expect(runsLeftLine(0)).toBe('No ranked runs left today');
    expect(placementLines(3)).toEqual({ title: '3 / 5 placed', toGo: '2 placement runs to go' });
    expect(placementLines(4)).toEqual({ title: '4 / 5 placed', toGo: '1 placement run to go' });
    expect(comma(8_290)).toBe('8,290');
    expect(secs(2_140)).toBe('2.1s');
  });

  it('progress bar = distance between the current step and the next one', () => {
    // Gold I starts at 7,834, Platinum III at 8,500: 8,290 is (8290-7834)/666 = 68%
    expect(stepProgress(8_290)).toBeCloseTo(456 / 666, 5);
    expect(stepProgress(8_500)).toBe(0);
    expect(stepProgress(0)).toBe(0);
    expect(stepProgress(12_000)).toBe(1);
    expect(stepProgress(14_500)).toBe(1);
  });

  it('best 5 strip flags the lowest once 5 runs count', () => {
    expect(bestStrip([{ id: 'a', points: 1_910 }, { id: 'b', points: 1_780 }]).map((r) => r.lowest)).toEqual([false, false]);
    const five = [1_910, 1_780, 1_640, 1_540, 1_420].map((p, i) => ({ id: String(i), points: p }));
    expect(bestStrip(five).map((r) => r.lowest)).toEqual([false, false, false, false, true]);
  });
});

describe('season impact sentence (results slot)', () => {
  it('prototype: 1,740 replaces 1,420, season 8,610, you reach Platinum III', () => {
    const v = impactView(applyRun(PROTO(), run(1_740, 7)), { before: 412, after: 398 });
    expect(v.before.label).toBe('Gold I');
    expect(v.after.label).toBe('Platinum III');
    expect(v.moved).toBe(true);
    expect(`${v.lead}${v.score}${v.tail}`).toBe('This run replaces your lowest best run (1,420). Season score 8,610, and you reach Platinum III.');
    expect(v.ladder).toBe('You move from #412 to #398 on the ladder.');
  });

  it('a run that does not beat the 5th best', () => {
    const v = impactView(applyRun(PROTO(), run(1_300, 7)), { before: 412, after: 412 });
    expect(v.moved).toBe(false);
    expect(`${v.lead}${v.score}${v.tail}`).toBe('This run did not beat your lowest best run (1,420). Your season score stays 8,290.');
    expect(v.ladder).toBeNull();
  });

  it('counted without a promotion', () => {
    const v = impactView(applyRun(PROTO(), run(1_500, 7)), { before: 412, after: 405 });
    expect(`${v.lead}${v.score}${v.tail}`).toBe('This run replaces your lowest best run (1,420). Season score 8,370.');
  });

  it('placement runs, then placement complete', () => {
    const three = [run(1_500, 1), run(1_400, 2)];
    const v3 = impactView(applyRun(three, run(1_600, 3)), { before: null, after: null });
    expect(`${v3.lead}${v3.score}${v3.tail}`).toBe('Placement run 3 of 5. Season score 4,500.');
    const four = [run(1_500, 1), run(1_400, 2), run(1_600, 3), run(1_700, 4)];
    const v5 = impactView(applyRun(four, run(1_800, 5)), { before: null, after: 1_203 });
    expect(`${v5.lead}${v5.score}${v5.tail}`).toBe('Placement complete. Season score 8,000, you start in Gold I.');
    expect(v5.ladder).toBe('You are #1,203 on the ladder.');
  });
});
