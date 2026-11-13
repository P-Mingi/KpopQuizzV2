// Bunnyverse Cards (lane GOALS): the pure helpers of goals.ts: the sentence of a finished set, the twin of the sets and the complete sections.
import { describe, expect, it } from 'vitest';

import { GOAL_REWARD_PACKS, completeSections, dueSets, finishedLine, finishedOf, goalSets, goalsFromJson, setPhrase } from './goals';

describe('finishedLine', () => {
  it('names the set and the packs', () => {
    expect(finishedLine([{ id: 'group:A', kind: 'group', name: 'Aurora Nine', packs: 1 }])).toBe('You finished Aurora Nine. +1 pack waiting in Goals');
    expect(finishedLine([{ id: 'solo', kind: 'solo', name: null, packs: 1 }])).toBe('You finished the soloists. +1 pack waiting in Goals');
    expect(finishedLine([{ id: 'holo', kind: 'holo', name: null, packs: 3 }])).toBe('You finished every Holo card. +3 packs waiting in Goals');
    expect(finishedLine([{ id: 'gold', kind: 'gold', name: null, packs: 5 }])).toBe('You finished every Gold card. +5 packs waiting in Goals');
    expect(finishedLine([{ id: 'year:2016', kind: 'year', name: '2016', packs: 2 }])).toBe('You finished the debut year 2016. +2 packs waiting in Goals');
  });
  it('several sets make one sentence with the total; none make no line', () => {
    expect(finishedLine([
      { id: 'group:A', kind: 'group', name: 'Aurora Nine', packs: 1 }, { id: 'holo', kind: 'holo', name: null, packs: 3 }, { id: 'year:2016', kind: 'year', name: '2016', packs: 2 },
    ])).toBe('You finished Aurora Nine, every Holo card and the debut year 2016. +6 packs waiting in Goals');
    expect(finishedLine([])).toBeNull();
  });
  it('has no dash of any kind', () => {
    const t = ['group', 'solo', 'holo', 'gold', 'year'].map((k) => setPhrase({ kind: k as 'group', name: 'X' })).join(' ');
    expect(t).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });
});

describe('finishedOf and goalsFromJson', () => {
  it('reads what the database sent and ignores anything else', () => {
    expect(finishedOf(null)).toEqual([]);
    expect(finishedOf([{ id: 'holo', kind: 'holo', name: null, packs: 3 }, { nope: 1 }])).toEqual([{ id: 'holo', kind: 'holo', name: null, packs: 3 }]);
    const g = goalsFromJson({
      reward_packs: 3, finished: [],
      week: { week_start: '2026-11-09', ends_at: '2026-11-15T23:00:00+00:00', packs_opened: 4, kpopdle_wins: 1, new_cards: 2, goal_packs: 20, goal_wins: 3, goal_cards: 10, reward_packs: 2, reward_shards: 25, done: false, claimed: false },
      sets: [{ id: 'solo', kind: 'solo', name: null, packs: 1, total: 4, owned: 1, claimed: false }],
    });
    expect(g.rewardPacks).toBe(3);
    expect(g.week).toMatchObject({ weekStart: '2026-11-09', endsAt: '2026-11-15T23:00:00.000Z', packsOpened: 4, done: false });
  });
});

// The same catalog as cards-goals-sql.test.ts.
const E = [
  { id: 'group:G1', kind: 'group', name: 'Group One', group: null, debutYear: 2015 }, { id: 'group:G2', kind: 'group', name: 'Group Two', group: null, debutYear: 2016 },
  { id: 'group:G3', kind: 'group', name: 'Group Three', group: null, debutYear: 2016 }, { id: 'group:G4', kind: 'group', name: 'Group Four', group: null, debutYear: 2020 },
  { id: 'group:G5', kind: 'group', name: 'Group Five', group: 'x', debutYear: 2021 },
  { id: 'idol:A1', kind: 'idol', name: 'A1', group: 'Group One', debutYear: 2015 }, { id: 'idol:A2', kind: 'idol', name: 'A2', group: 'Group One', debutYear: 2015 },
  { id: 'idol:B1', kind: 'idol', name: 'B1', group: 'Group Two', debutYear: 2016 }, { id: 'idol:D1', kind: 'idol', name: 'D1', group: 'Group Three', debutYear: 2016 },
  { id: 'idol:C1', kind: 'idol', name: 'C1', group: 'Group Five', debutYear: 2021 }, { id: 'idol:S1', kind: 'idol', name: 'S1', group: null, debutYear: 2019 },
  { id: 'event:e1', kind: 'event', name: 'Event', group: null, debutYear: 2018 },
] as const;
const C = [
  [1, 'group:G1', 'C'], [2, 'idol:A1', 'C'], [3, 'idol:A1', 'R'], [4, 'idol:A1', 'UR'], [5, 'idol:A2', 'C'], [6, 'idol:A2', 'R'], [7, 'group:G2', 'C'], [8, 'idol:B1', 'C'],
  [9, 'idol:B1', 'UR'], [10, 'group:G3', 'C'], [11, 'idol:D1', 'R'], [12, 'group:G4', 'C'], [13, 'idol:C1', 'C'], [14, 'idol:S1', 'C'], [15, 'idol:S1', 'R'], [16, 'idol:S1', 'UR'], [17, 'event:e1', 'C'],
].map(([n, entity, rarity]) => ({ n: n as number, entity: entity as string, rarity: rarity as string, kind: E.find((e) => e.id === entity)!.kind }));

describe('goalSets, the twin of cards_goals_progress', () => {
  it('has the same sets, counts and packs as the SQL test (cards-goals-sql.test.ts)', () => {
    const sets = goalSets(C, E, new Set(), new Set());
    const by = Object.fromEntries(sets.map((s) => [s.id, s]));
    expect(sets.map((s) => s.id).sort()).toEqual(['gold', 'group:G1', 'group:G2', 'group:G3', 'group:G4', 'holo', 'solo', 'year:2016']);
    expect([by['group:G1']!.total, by['group:G2']!.total, by['group:G3']!.total, by['group:G4']!.total]).toEqual([6, 3, 2, 1]);
    expect([by.solo!.total, by.holo!.total, by.gold!.total, by['year:2016']!.total]).toEqual([4, 4, 3, 5]);
    expect(sets.every((s) => s.packs === GOAL_REWARD_PACKS[s.kind])).toBe(true);
  });
  it('finds the sets that are due, and a claimed set is never due again', () => {
    const own = new Set([12, 13, 14, 15, 16]);
    expect(dueSets(goalSets(C, E, own, new Set())).map((s) => s.id).sort()).toEqual(['group:G4', 'solo']);
    expect(dueSets(goalSets(C, E, own, new Set(['group:G4', 'solo'])))).toEqual([]);
  });
});

describe('completeSections', () => {
  it('a section is complete when every card is owned and it holds a group card of its own', () => {
    const kinds: Record<number, string> = { 1: 'group', 2: 'idol', 3: 'idol' };
    const secs = [{ id: 'one', ns: [1, 2] }, { id: 'two', ns: [3] }, { id: 'none', ns: [] }];
    expect([...completeSections(secs, (n) => kinds[n], new Set([1, 2, 3]))].sort()).toEqual(['one']);
    expect([...completeSections(secs, (n) => kinds[n], new Set([1, 3]))]).toEqual([]);
  });
});
