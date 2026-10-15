import { describe, expect, it } from 'vitest';

import type { PublicStats } from '@/lib/stats/site-stats';

import { extractCountClaims, judgeClaim, numberTokens, numbersMissingFrom, parseCount, type CountClaim } from './prod-crawl-counts';

// The fresh read of 15 October 2026 (anon key, SONGS_IS_CURATED unset), used as a fixture.
const STATS: PublicStats = { quizzes: 458, groupsWithQuizzes: 47, groupsListed: 95, songs: 4281, songGroups: 85, plays: 73965, asOf: '2026-10-15T20:10:08.407Z' };

const one = (text: string): CountClaim => {
  const c = extractCountClaims(text);
  expect(c, text).toHaveLength(1);
  return c[0]!;
};

describe('parseCount', () => {
  it('reads separators of both languages and K roundings', () => {
    expect(parseCount('73,000')).toEqual({ value: 73000, kForm: false });
    expect(parseCount('73.000')).toEqual({ value: 73000, kForm: false });
    expect(parseCount('458')).toEqual({ value: 458, kForm: false });
    expect(parseCount('73.9K')).toEqual({ value: 73900, kForm: true });
    expect(parseCount('42k')).toEqual({ value: 42000, kForm: true });
    expect(parseCount('97.5')).toBeNull();
  });
});

describe('extractCountClaims (phrases read on production, 15 October 2026)', () => {
  it('reads floors with modifiers between the number and the noun', () => {
    expect(one('K-pop Quiz - 450+ Free Fan-Made Quizzes for Every Group')).toMatchObject({ value: 450, floor: true, noun: 'quizzes', raw: '450+ Free Fan-Made Quizzes' });
    expect(one('a blind test of 4,200+ songs')).toMatchObject({ value: 4200, floor: true, noun: 'songs' });
  });

  it('tells quizzes played from quizzes published', () => {
    const claims = extractCountClaims('73,000+ Quizzes played 450+ Quizzes published 47 Groups with quizzes');
    expect(claims.map((c) => [c.value, c.noun])).toEqual([[73000, 'plays'], [450, 'quizzes'], [47, 'groups']]);
    expect(claims[0]!.raw).toBe('73,000+ Quizzes played');
  });

  it('finds every count in a sentence, nothing consumed', () => {
    const claims = extractCountClaims('The catalog has 4,200+ songs across 85 groups and 73,000+ quiz plays so far.');
    expect(claims.map((c) => [c.value, c.noun, c.floor])).toEqual([[4200, 'songs', true], [85, 'groups', false], [73000, 'plays', true]]);
  });

  it('reads Portuguese floors and separators', () => {
    const claims = extractCountClaims('O catalogo tem mais de 4.200 musicas de 85 grupos.');
    expect(claims.map((c) => [c.value, c.noun, c.floor])).toEqual([[4200, 'songs', true], [85, 'groups', false]]);
    expect(one('73.000+ Quizzes jogados')).toMatchObject({ value: 73000, noun: 'plays', floor: true });
  });

  it('flags K roundings and "over" floors', () => {
    const claims = extractCountClaims('458 published quizzes, 4281 blind test songs and 73.9K quiz plays');
    expect(claims.map((c) => [c.value, c.noun, c.kForm])).toEqual([[458, 'quizzes', false], [4281, 'songs', false], [73900, 'plays', true]]);
    expect(claims[2]!.raw).toBe('73.9K quiz plays');
    expect(one('Over 450 quizzes to play')).toMatchObject({ value: 450, floor: true });
  });

  it('ignores numbers without a count noun and decimals', () => {
    expect(extractCountClaims('members named at 97.5%, eras placed at 41.6%')).toEqual([]);
    expect(extractCountClaims('10 questions, about 1 min, Name all 7 members')).toEqual([]);
  });
});

describe('judgeClaim', () => {
  it('accepts atLeast() and exact() renderings of the current count', () => {
    expect(judgeClaim(one('450+ quizzes'), STATS)).toEqual({ ok: true, stat: 'quizzes' });
    expect(judgeClaim(one('458 fan-made quizzes'), STATS)).toEqual({ ok: true, stat: 'quizzes' });
    expect(judgeClaim(one('73,000+ quiz plays'), STATS)).toEqual({ ok: true, stat: 'plays' });
    expect(judgeClaim(one('4,281 blind test songs'), STATS)).toEqual({ ok: true, stat: 'songs' });
  });

  it('a groups count may be any of the three group stats', () => {
    expect(judgeClaim(one('47 Groups with quizzes'), STATS)).toEqual({ ok: true, stat: 'groupsWithQuizzes' });
    expect(judgeClaim(one('95 K-pop groups'), STATS)).toEqual({ ok: true, stat: 'groupsListed' });
    expect(judgeClaim(one('85 groups'), STATS)).toEqual({ ok: true, stat: 'songGroups' });
  });

  it('a page trailing the read by what the lag window added is consistent, beyond it is not', () => {
    const stats = { ...STATS, plays: 74010 };
    expect(judgeClaim(one('73,000+ plays'), stats).ok).toBe(false);
    expect(judgeClaim(one('73,000+ plays'), stats, { plays: 921 })).toEqual({ ok: true, stat: 'plays' });
    expect(judgeClaim(one('72,000+ plays'), stats, { plays: 921 }).ok).toBe(false);
    expect(judgeClaim(one('456 quizzes'), STATS, { quizzes: 5 })).toEqual({ ok: true, stat: 'quizzes' });
    expect(judgeClaim(one('452 quizzes'), STATS, { quizzes: 5 })).toMatchObject({ ok: false, ignored: false });
  });

  it('catches the typed and stale totals Mission 1 found', () => {
    expect(judgeClaim(one('380+ quizzes'), { ...STATS, quizzes: 455 })).toMatchObject({ ok: false, ignored: false });
    expect(judgeClaim(one('42k+ plays'), { ...STATS, plays: 73277 })).toMatchObject({ ok: false, ignored: false });
  });

  it('a floor must be what atLeast() prints, not any smaller true number', () => {
    expect(judgeClaim(one('455+ quizzes'), STATS)).toMatchObject({ ok: false, ignored: false });
    expect(judgeClaim(one('400+ quizzes'), STATS)).toMatchObject({ ok: false, ignored: false });
  });

  it('an exact count close to a total is a claim about it; far from every total it is a per-entity count', () => {
    const v = judgeClaim(one('All 93 groups'), STATS);
    expect(v).toMatchObject({ ok: false, ignored: false });
    if (!v.ok && !v.ignored) expect(v.reason).toMatch(/groupsListed = 95/);
    expect(judgeClaim(one('46 groups, A to Z'), STATS)).toMatchObject({ ok: false, ignored: false });
    expect(judgeClaim(one('Play 29 free BTS quizzes'), STATS)).toEqual({ ok: false, ignored: true });
    expect(judgeClaim(one('10,459 plays'), STATS)).toEqual({ ok: false, ignored: true });
    const ranked = extractCountClaims('Ranked from 268 quizzes with at least 30 plays');
    expect(ranked.map((c) => judgeClaim(c, STATS))).toEqual([{ ok: false, ignored: true }, { ok: false, ignored: true }]);
  });

  it('a K rounding of a total is never a shared-helper rendering; a K rounding of a quiz card is not a total', () => {
    const v = judgeClaim(extractCountClaims('73.9K quiz plays')[0]!, STATS);
    expect(v).toMatchObject({ ok: false, ignored: false });
    if (!v.ok && !v.ignored) expect(v.reason).toMatch(/K rounding/);
    expect(judgeClaim(one('2.5k plays'), STATS)).toEqual({ ok: false, ignored: true });
  });

  it('a floor far from every total is a fact about the world, not a site count', () => {
    expect(judgeClaim(one('seven members, nine albums, 200+ songs'), STATS)).toEqual({ ok: false, ignored: true });
    expect(judgeClaim(one('quizzes about 30+ groups'), STATS)).toMatchObject({ ok: false, ignored: false });
  });

  it('no page may state a count of people (the stats function has none)', () => {
    expect(judgeClaim(one('Join 10,000+ players'), STATS)).toMatchObject({ ok: false, ignored: false });
    expect(judgeClaim(one('3 players online'), STATS)).toEqual({ ok: false, ignored: true });
  });
});

describe('numbers of a JSON-LD description', () => {
  it('reads tokens of 10 and up the same way on both sides', () => {
    expect(numberTokens('458 quizzes, 4281 songs, 73.9K plays, 7 members, 97.5%')).toEqual([458, 4281, 73900]);
  });

  it('lists the numbers the visible text never shows', () => {
    expect(numbersMissingFrom('458 published quizzes, 4281 blind test songs and 73.9K quiz plays', 'KpopQuiz hosts 458 fan-made quizzes and 4,281 blind test songs')).toEqual([73900]);
    expect(numbersMissingFrom('play 29 free tests', 'Play 29 free BTS quizzes')).toEqual([]);
  });
});
