import { describe, expect, it } from 'vitest';

import {
  MIN_BT_PLAYS,
  MIN_NUDGE_PLAYS,
  fansPickedTitle,
  firstSignals,
  hubState,
  hubTemplates,
  liveHref,
  movementView,
  resultsTotal,
  thinNudge,
  waysToPlay,
} from './growth';
import { averagePct } from './model';

import type { WaysInput } from './growth';

const base: WaysInput = {
  slug: 'stray-kids',
  name: 'Stray Kids',
  quizzes: 29,
  songs: 18,
  nameAll: { href: '/stray-kids-name-all-members', members: 8, perfectPct: 38 },
  whichMember: { href: '/which-stray-kids-member-are-you', results: 12480 },
  thisOrThat: null,
  live: true,
};

describe('G8 hub growth: ways to play', () => {
  it('lists only the ways that exist, in the prototype order, four at most', () => {
    const tiles = waysToPlay(base);
    expect(tiles.map((t) => t.key)).toEqual(['quizzes', 'blindtest', 'name-all', 'which-member']);
    expect(tiles[0]!.href).toBe('#hub-quizzes');
    expect(tiles[0]!.body).toBe('29 fan-made Stray Kids quizzes.');
    expect(tiles[1]!.href).toBe('/blindtest/group-stray-kids');
    expect(tiles[1]!.body).toBe('18 Stray Kids songs, ten-second clips.');
    expect(tiles[2]!.body).toBe('All 8 members in 60 seconds.');
    expect(tiles[2]!.foot).toBe('38% get them all');
    expect(tiles[3]!.foot).toBe('12,480 results');
    expect(tiles.filter((t) => t.isNew).map((t) => t.key)).toEqual(['name-all', 'which-member']);
  });

  it('offers Play live only while the row has room and the group has a blindtest', () => {
    const thin = waysToPlay({ ...base, slug: 'katseye', name: 'KATSEYE', quizzes: 1, songs: 16, nameAll: null, whichMember: null });
    expect(thin.map((t) => t.key)).toEqual(['quizzes', 'blindtest', 'live']);
    expect(thin[2]!.href).toBe('/live?playlist=katseye&name=KATSEYE');
    expect(thin[0]!.body).toBe('1 fan-made KATSEYE quiz.');
    expect(waysToPlay({ ...base, songs: 0, nameAll: null, whichMember: null })).toEqual([]);
    expect(waysToPlay({ ...base, live: false, nameAll: null, whichMember: null }).map((t) => t.key)).toEqual(['quizzes', 'blindtest']);
    expect(waysToPlay({ ...base, live: false, nameAll: null, whichMember: null })[1]!.foot).toBeNull();
  });

  it('hides a number that does not exist instead of printing one', () => {
    const tiles = waysToPlay({ ...base, nameAll: { href: '/x', members: 8, perfectPct: null }, whichMember: { href: '/y', results: null } });
    expect(tiles[2]!.foot).toBeNull();
    expect(tiles[3]!.foot).toBeNull();
  });

  it('shows This or that only for a ranked group, linked to the Fans picked section', () => {
    const tiles = waysToPlay({ ...base, nameAll: null, whichMember: null, thisOrThat: { votes: 1450 } });
    expect(tiles.map((t) => t.key)).toEqual(['quizzes', 'blindtest', 'this-or-that', 'live']);
    expect(tiles[2]!.href).toBe('#fans-picked');
    expect(tiles[2]!.foot).toBe('1,450 votes');
  });

  it('shows nothing on a hub without a quiz, or with a single way to play', () => {
    expect(waysToPlay({ ...base, quizzes: 0 })).toEqual([]);
    expect(waysToPlay({ ...base, songs: 0, nameAll: null, whichMember: null, live: false })).toEqual([]);
  });

  it('escapes the live link', () => {
    expect(liveHref('tomorrow-x-together', 'TOMORROW X TOGETHER')).toBe('/live?playlist=tomorrow-x-together&name=TOMORROW%20X%20TOGETHER');
  });

  it('adds up saved results and hides a small total', () => {
    expect(resultsTotal({ a: 10, b: 15 }, 20)).toBe(25);
    expect(resultsTotal({ a: 10, b: 5 }, 20)).toBeNull();
    expect(resultsTotal(null, 20)).toBeNull();
    expect(resultsTotal({ a: Number.NaN, b: -3 }, 1)).toBeNull();
  });
});

describe('G8 hub growth: fans create', () => {
  it('knows the three states', () => {
    expect([0, 1, 2, 3].map(hubState)).toEqual(['empty', 'thin', 'thin', 'full']);
  });

  it('prints only the signals that exist', () => {
    const none = firstSignals({ name: 'RIIZE', songs: 0, btPlays: null });
    expect(none.map((s) => s.icon)).toEqual(['star', 'bell']);
    const songs = firstSignals({ name: 'RIIZE', songs: 18, btPlays: MIN_BT_PLAYS - 1 });
    expect(songs[0]!.text).toBe('18 RIIZE songs are already in the blindtest, so fans are here.');
    expect(songs).toHaveLength(3);
    const all = firstSignals({ name: 'RIIZE', songs: 18, btPlays: 1240 });
    expect(all[1]!.text).toBe('Fans played the RIIZE blindtest 1,240 times.');
    expect(all).toHaveLength(4);
  });

  it('offers three templates, each a real quiz type with the group prefilled', () => {
    const t = hubTemplates('riize');
    expect(t.map((x) => x.type)).toEqual(['multiple_choice', 'true_false', 'guess_from_clues']);
    expect(t[1]!.href).toBe('/create?group=riize&type=true_false');
  });

  it('nudges a thin hub with the real plays, or without a number', () => {
    const n = thinNudge({ slug: 'katseye', name: 'KATSEYE', fandom: 'EYEKON', quizzes: 1, plays: 211 });
    expect(n).toEqual({
      title: 'Only 1 KATSEYE quiz so far.',
      body: 'Fans played it 211 times in the last 60 days. Make the next one and it shows here for every EYEKON.',
      href: '/create?group=katseye',
    });
    expect(thinNudge({ slug: 'x', name: 'X', fandom: 'fan', quizzes: 2, plays: MIN_NUDGE_PLAYS - 1 })!.body).toBe('Make the next one and it shows here for every X fan.');
    expect(thinNudge({ slug: 'x', name: 'X', fandom: null, quizzes: 2, plays: 1500 })!.body).toBe('Fans played them 1,500 times in the last 60 days. Make the next one and it shows here for every X fan.');
    expect(thinNudge({ slug: 'x', name: 'X', fandom: null, quizzes: 2, plays: null })!.title).toBe('Only 2 X quizzes so far.');
    expect(thinNudge({ slug: 'x', name: 'X', fandom: null, quizzes: 0, plays: 50 })).toBeNull();
    expect(thinNudge({ slug: 'x', name: 'X', fandom: null, quizzes: 3, plays: 50 })).toBeNull();
  });
});

describe('G8 hub growth: fans picked', () => {
  it('titles the section with the real fandom name', () => {
    expect(fansPickedTitle('STAY')).toBe('STAY picked');
    expect(fansPickedTitle('fan')).toBe('Fans picked');
    expect(fansPickedTitle(null)).toBe('Fans picked');
  });

  it('words the weekly movement', () => {
    expect(movementView(2, false)).toEqual({ text: '+2', label: 'up 2', tone: 'up' });
    expect(movementView(-1, false)).toEqual({ text: '-1', label: 'down 1', tone: 'down' });
    expect(movementView(0, false)).toEqual({ text: '0', label: 'no change', tone: 'flat' });
    expect(movementView(null, true)).toEqual({ text: 'New', label: 'new this week', tone: 'new' });
    expect(movementView(null, false)).toBeNull();
  });
});

describe('G1 request S2: the hub average uses the quiz type', () => {
  const q = { total_score_sum: 180, total_completions: 10, question_count: 6 };
  it('a guess-from-clues quiz is scored over 3 points a question', () => {
    expect(averagePct({ ...q, quiz_type: 'guess_from_clues' })).toBe(100);
    expect(averagePct({ ...q, total_score_sum: 90, quiz_type: 'guess_from_clues' })).toBe(50);
  });
  it('other types are scored over 1 point a question', () => {
    expect(averagePct({ ...q, total_score_sum: 48, quiz_type: 'multiple_choice' })).toBe(80);
    expect(averagePct({ ...q, total_completions: 0, quiz_type: 'multiple_choice' })).toBeNull();
  });
});
