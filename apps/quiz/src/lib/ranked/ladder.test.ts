import { describe, expect, it } from 'vitest';

import { compareStandings, computeLegends, rankLadder } from './ladder';

import type { Standing } from './ladder';

const at = (min: number): string => new Date(Date.UTC(2026, 9, 1, 0, min)).toISOString();

function s(id: string, seasonScore: number, avgAnswerMs: number | null, reachedMin = 0, runs = 5): Standing {
  return { playerId: id, seasonScore, avgAnswerMs, reachedAt: at(reachedMin), runs };
}

describe('ties are broken by average answer time', () => {
  it('same score: the faster average ranks first', () => {
    const ladder = rankLadder([s('slow', 8_290, 2_400), s('fast', 8_290, 2_100), s('top', 9_000, 3_000)]);
    expect(ladder.map((r) => [r.playerId, r.position])).toEqual([
      ['top', 1],
      ['fast', 2],
      ['slow', 3],
    ]);
  });

  it('same score and average: who reached it first, then id', () => {
    expect(rankLadder([s('late', 5_000, 2_000, 30), s('early', 5_000, 2_000, 10)]).map((r) => r.playerId)).toEqual(['early', 'late']);
    expect(rankLadder([s('b', 5_000, 2_000, 10), s('a', 5_000, 2_000, 10)]).map((r) => r.playerId)).toEqual(['a', 'b']);
  });

  it('no right answer (no average) sorts after any average', () => {
    expect(compareStandings(s('none', 100, null), s('some', 100, 9_000))).toBeGreaterThan(0);
    expect(compareStandings(s('some', 100, 9_000), s('none', 100, null))).toBeLessThan(0);
  });

  it('players still placing (under 5 runs) are not on the ladder', () => {
    const ladder = rankLadder([s('placed', 4_000, 2_000), s('placing', 6_000, 1_500, 0, 4)]);
    expect(ladder.map((r) => r.playerId)).toEqual(['placed']);
  });
});

describe('Legend = top 100 Masters', () => {
  it('keeps the 100 best Masters in ladder order, never a non-Master', () => {
    const masters = Array.from({ length: 150 }, (_, i) => s(`m${String(i).padStart(3, '0')}`, 12_000 + i, 2_000));
    const legends = computeLegends([...masters, s('diamond', 11_999, 1_000)]);
    expect(legends).toHaveLength(100);
    expect(legends[0]).toMatchObject({ playerId: 'm149', position: 1 });
    expect(legends[99]).toMatchObject({ playerId: 'm050', position: 100 });
    expect(legends.some((l) => l.playerId === 'diamond')).toBe(false);
  });

  it('fewer than 100 Masters: all of them', () => {
    expect(computeLegends([s('a', 12_500, 2_000), s('b', 12_000, 1_000), s('c', 9_000, 1_000)]).map((l) => l.playerId)).toEqual(['a', 'b']);
  });
});
