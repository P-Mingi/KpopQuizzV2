// V12 F5b: on /creators, plays BY editorial accounts on other creators' quizzes no
// longer count. Without `notPlayers` countPlays counts exactly as before.

import { describe, expect, it } from 'vitest';

import { countPlays, rankCreators } from './board';

import type { PlayRow, QuizRow } from './board';

const TEAM = 'team-1';
const quiz = (id: string, creator: string): QuizRow => ({ id, creator_id: creator, group_id: 1, title: id, slug: id, created_at: '2026-09-01T00:00:00Z' });
const QUIZZES = new Map([['q1', quiz('q1', 'mina')], ['q2', quiz('q2', 'jae')]]);
let n = 0;
const play = (quizId: string, player: string | null, day = '2026-10-01'): PlayRow => ({ id: `p${(n += 1)}`, quiz_id: quizId, player_id: player, anon_id: player ? null : `a${n}`, created_at: `${day}T10:00:00Z` });

// The team account plays Mina's quiz on three days; fans play both quizzes.
const PLAYS = [
  play('q1', TEAM, '2026-10-01'), play('q1', TEAM, '2026-10-02'), play('q1', TEAM, '2026-10-03'),
  play('q1', 'fan-a'), play('q2', 'fan-a'), play('q2', 'fan-b'), play('q2', null),
];

describe('countPlays with editorial players', () => {
  it('without notPlayers: today count (the team plays count)', () => {
    const c = countPlays(PLAYS, QUIZZES, new Set());
    expect(c.byCreator.get('mina')).toBe(4);
    expect(rankCreators(c.byCreator).map((r) => r.id)).toEqual(['mina', 'jae']);
  });

  it('with the team as notPlayers: their plays are gone, the ranking follows', () => {
    const c = countPlays(PLAYS, QUIZZES, new Set([TEAM]), undefined, new Set([TEAM]));
    expect(c.byCreator.get('mina')).toBe(1);
    expect(c.byQuiz.get('q1')).toBe(1);
    expect(c.byCreator.get('jae')).toBe(3);
    expect(rankCreators(c.byCreator).map((r) => r.id)).toEqual(['jae', 'mina']);
  });

  it('an empty notPlayers set changes nothing', () => {
    expect(countPlays(PLAYS, QUIZZES, new Set(), undefined, new Set())).toEqual(countPlays(PLAYS, QUIZZES, new Set()));
  });
});
