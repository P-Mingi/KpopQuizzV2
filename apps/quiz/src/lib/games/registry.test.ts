import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isKnownRouteWith } from '@/lib/route-allowlist';
import { TITLE_MAX } from '@/lib/seo/quiz-meta';
import { atLeast } from '@/lib/stats/site-stats';

import {
  ANSWER_MAX_WORDS,
  ANSWER_MIN_WORDS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DIFFICULTY_MIN_ATTEMPTS,
  GRID_MIN,
  GRID_SIZE,
  GROUP_GAMES_ID,
  buildGames,
  difficultyAnswer,
  difficultyTable,
  friendsBlock,
  gameUrl,
  gamesAnswer,
  gamesDescription,
  gamesFaq,
  gamesTitle,
  groupGames,
  groupGrid,
  monthLabel,
  orList,
  wordCount,
} from './registry';

import type { GamesFacts, GridGroupInput } from './registry';
import type { PublicStats } from '@/lib/stats/site-stats';
import type { WaysInput } from '@/lib/ux-v1/p3/growth';

// SEO Mission 2, part A: the registry behind /kpop-games, its title, description and answer
// block, the difficulty table, the group grid and the hub's "{Group} games" section.

const STATS: PublicStats = { quizzes: 469, groupsWithQuizzes: 61, groupsListed: 95, songs: 4236, songGroups: 84, plays: 73965, asOf: '2026-10-15T12:00:00Z' };
const fmt = { quizzes: 375, groups: 55, medianQuestions: 10 };

function facts(over: Partial<GamesFacts> = {}): GamesFacts {
  return {
    v1: true,
    v12: true,
    liveOpen: true,
    stats: STATS,
    playlistGroups: 79,
    nameAll: [{ slug: 'aespa', name: 'aespa' }, { slug: 'bts', name: 'BTS' }],
    wma: [{ slug: 'bts', name: 'BTS' }, { slug: 'stray-kids', name: 'Stray Kids' }],
    formats: { choice: fmt, trueFalse: { quizzes: 70, groups: 30, medianQuestions: 10 }, clues: { quizzes: 13, groups: 9, medianQuestions: 8 } },
    ...over,
  };
}

const DASHES = /[\u2013\u2014]/;
const RETIRED = /tier list|tier-list|ranking|battle|\/games\b|duel/i;

/** Every fact combination a build can meet (flags, live mode, counts read or not). */
function allFacts(): GamesFacts[] {
  const out: GamesFacts[] = [];
  for (const v1 of [true, false]) for (const v12 of [true, false]) for (const liveOpen of [true, false]) for (const stats of [STATS, null]) {
    for (const formats of [facts().formats, null]) {
      if (v12 && !v1) continue; // v12 never runs without v11 (lib/ux-v12.ts)
      out.push(facts({ v1, v12, liveOpen, stats, formats, playlistGroups: stats ? 79 : null }));
    }
  }
  return out;
}

describe('buildGames', () => {
  it('lists the live games of a production build, in order', () => {
    const games = buildGames(facts());
    expect(games.map((g) => g.id)).toEqual([
      'blind-test', 'daily-blind-test', 'ranked-blind-test', 'live-blind-test', 'name-them-all', 'which-member', 'quizzes', 'true-or-false', 'guess-the-idol',
    ]);
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
  });

  it('drops a game that does not exist on the build', () => {
    expect(buildGames(facts({ v12: false })).map((g) => g.id)).not.toEqual(expect.arrayContaining(['live-blind-test']));
    const off = buildGames(facts({ v1: false, v12: false })).map((g) => g.id);
    expect(off).toEqual(['blind-test', 'daily-blind-test', 'quizzes', 'true-or-false', 'guess-the-idol']);
    expect(buildGames(facts({ liveOpen: false })).map((g) => g.id)).not.toContain('live-blind-test');
    expect(buildGames(facts({ nameAll: [] })).map((g) => g.id)).not.toContain('name-them-all');
    expect(buildGames(facts({ wma: [] })).map((g) => g.id)).not.toContain('which-member');
  });

  it('a quiz format with no published quiz is not a game; an unknown count keeps its page', () => {
    const none = facts({ formats: { choice: fmt, trueFalse: { quizzes: 0, groups: 0, medianQuestions: null }, clues: { quizzes: 0, groups: 0, medianQuestions: null } } });
    expect(buildGames(none).map((g) => g.id)).not.toEqual(expect.arrayContaining(['true-or-false']));
    expect(buildGames(none).map((g) => g.id)).not.toContain('guess-the-idol');
    expect(buildGames(facts({ formats: null })).map((g) => g.id)).toEqual(expect.arrayContaining(['true-or-false', 'guess-the-idol']));
  });

  it('every game is complete, linked to a reachable route, and free of retired features and dashes', () => {
    for (const f of allFacts()) {
      const games = buildGames(f);
      const ids = new Set(games.map((g) => g.id));
      for (const g of games) {
        for (const text of [g.name, g.what, g.duration, g.groups, g.question, g.answer, ...g.links.map((l) => l.label)]) {
          expect(text.trim().length, `${g.id}`).toBeGreaterThan(0);
          expect(text, `${g.id}: ${text}`).not.toMatch(DASHES);
          expect(text, `${g.id}: ${text}`).not.toMatch(RETIRED);
        }
        expect(g.question.endsWith('?'), g.question).toBe(true);
        expect(['Solo', 'Group']).toContain(g.players);
        if (g.href.startsWith('#')) expect(ids.has(g.href.slice(1) as typeof g.id), g.href).toBe(true);
        for (const href of [g.href, ...g.links.map((l) => l.href)].filter((h) => !h.startsWith('#'))) {
          const path = href.split('?')[0]!;
          expect(isKnownRouteWith(path, { v1: f.v1, v12: f.v12 }), `${g.id} -> ${href}`).toBe(true);
        }
      }
    }
  });

  it('counts are the live ones, rounded by the shared helper', () => {
    const games = buildGames(facts());
    const quizzes = games.find((g) => g.id === 'quizzes')!;
    expect(quizzes.answer).toContain(`${atLeast(STATS.quizzes)} published K-pop quizzes about ${atLeast(STATS.groupsWithQuizzes)} groups`);
    expect(quizzes.groups).toBe(`${atLeast(STATS.groupsWithQuizzes)} groups`);
    const bt = games.find((g) => g.id === 'blind-test')!;
    expect(bt.answer).toContain(`${atLeast(STATS.songs)} songs from ${atLeast(STATS.songGroups)} groups, and 79 groups have a playlist of their own`);
    expect(games.find((g) => g.id === 'name-them-all')!.groups).toBe('2 groups');
    // Without the counts, no number is invented.
    const vague = buildGames(facts({ stats: null, playlistGroups: null }));
    expect(vague.find((g) => g.id === 'quizzes')!.answer).toContain('hundreds of published K-pop quizzes');
    expect(vague.find((g) => g.id === 'blind-test')!.answer).not.toMatch(/\d+\+/);
  });

  it('a game with one page per group links its section here and every group page there', () => {
    const games = buildGames(facts());
    const na = games.find((g) => g.id === 'name-them-all')!;
    expect(na.href).toBe('#name-them-all');
    expect(na.links).toEqual([{ href: '/aespa-name-all-members', label: 'aespa' }, { href: '/bts-name-all-members', label: 'BTS' }]);
    expect(gameUrl(na)).toBe('https://kpopquiz.org/kpop-games#name-them-all');
    expect(gameUrl(games[0]!)).toBe('https://kpopquiz.org/blindtest');
    expect(games.find((g) => g.id === 'which-member')!.links.map((l) => l.href)).toEqual(['/which-bts-member-are-you', '/which-stray-kids-member-are-you']);
  });
});

describe('title, description, answer block', () => {
  it('title: the asked wording, 60 characters or fewer with " | KpopQuiz"', () => {
    expect(gamesTitle(9)).toBe('K-pop Games: 9 Free Games to Play Online');
    for (let n = 1; n <= 999; n += 1) {
      const t = gamesTitle(n);
      expect(t.length + ' | KpopQuiz'.length, t).toBeLessThanOrEqual(60);
      expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it('description: 150 to 160 characters, the game count, "K-pop games" once, for every build', () => {
    for (const f of allFacts()) {
      const games = buildGames(f);
      for (const stats of [f.stats, { ...STATS, quizzes: 1234 }, { ...STATS, quizzes: 99 }]) {
        const d = gamesDescription(games, stats);
        expect(d.length, d).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
        expect(d.length, d).toBeLessThanOrEqual(DESCRIPTION_MAX);
        expect(d).toContain(`${games.length} free K-pop games`);
        expect(d.match(/K-pop games/g)?.length).toBe(1);
        expect(d).not.toMatch(DASHES);
      }
    }
  });

  it('answer block: 40 to 60 words with the number of games and the month', () => {
    const month = monthLabel(STATS.asOf);
    expect(month).toBe('October 2026');
    for (const f of allFacts()) {
      const games = buildGames(f);
      const a = gamesAnswer(games, f.stats, month);
      expect(wordCount(a), a).toBeGreaterThanOrEqual(ANSWER_MIN_WORDS);
      expect(wordCount(a), a).toBeLessThanOrEqual(ANSWER_MAX_WORDS);
      expect(a).toContain(`${games.length} free K-pop games`);
      expect(a).toContain('October 2026');
      expect(a).not.toMatch(DASHES);
      if (f.stats) expect(a).toContain(atLeast(f.stats.songs));
    }
  });

  it('orList', () => {
    expect(orList([5, 10, 15])).toBe('5, 10 or 15');
    expect(orList(['a'])).toBe('a');
  });
});

describe('friends and FAQ', () => {
  it('never promises a game the build does not have', () => {
    const noLive = buildGames(facts({ liveOpen: false }));
    expect(friendsBlock(noLive, true).items.map((i) => i.title)).toEqual(['Challenge a friend', 'This or that']);
    expect(JSON.stringify(gamesFaq(noLive))).not.toMatch(/live blindtest/i);
    const all = buildGames(facts());
    expect(friendsBlock(all, true).items.map((i) => i.title)).toEqual(['Live blindtest', 'Challenge a friend', 'This or that']);
    expect(friendsBlock(all, false).items.map((i) => i.title)).not.toContain('This or that');
  });

  it('the FAQ answers free, account, phone and friends, from the games listed', () => {
    const faq = gamesFaq(buildGames(facts()));
    expect(faq.map((f) => f.q)).toEqual(['Are the K-pop games free?', 'Do I need an account?', 'Can I play on my phone?', 'Can I play K-pop games with friends?']);
    const account = faq[1]!.a;
    expect(account).toContain('You need a free account to play Ranked blindtest.');
    expect(account).toContain('Blindtest of the day');
    expect(gamesFaq(buildGames(facts({ v1: false, v12: false })))[1]!.a).not.toContain('Ranked');
    for (const f of faq) expect(f.a).not.toMatch(DASHES);
  });
});

describe('difficulty table', () => {
  const games = buildGames(facts());
  const sample = (right: number, asked: number, attempts: number, since = '2026-07-22T10:00:00Z') => ({ right, asked, attempts, since });

  it('hardest first, with the denominator and the month, only above the floor', () => {
    const t = difficultyTable(games, {
      'blind-test': sample(5060, 6340, 634, '2026-10-05T00:00:00Z'),
      'daily-blind-test': sample(576, 1070, 107),
      'name-them-all': sample(6959, 7968, 1101, '2026-08-05T00:00:00Z'),
      'ranked-blind-test': sample(0, 0, 0, ''),
      'live-blind-test': null,
      quizzes: sample(380169, 535000, 57259, '2026-03-10T00:00:00Z'),
      'true-or-false': sample(DIFFICULTY_MIN_ATTEMPTS - 1, 1000, DIFFICULTY_MIN_ATTEMPTS - 1),
    })!;
    expect(t.rows.map((r) => r.id)).toEqual(['daily-blind-test', 'quizzes', 'blind-test', 'name-them-all']);
    expect(t.rows[0]).toMatchObject({ pct: 54, basedOn: '107 daily scores', since: 'July 2026' });
    expect(t.rows[1]!.basedOn).toBe('57,259 plays');
    expect(t.thin).toEqual(['Ranked blindtest', 'Live blindtest', 'K-pop true or false']);
    expect(t.unscored).toEqual(['Which member are you? has no right answers', 'Guess the K-pop idol scores points per clue, not right answers']);
    const a = difficultyAnswer(t);
    expect(a).toContain('Blindtest of the day is the hardest so far: players get 54% of the songs right, over 107 daily scores since July 2026.');
    expect(a).toContain('Name them all is the easiest: players name 87% of the members.');
    expect(a).not.toMatch(DASHES);
  });

  it('min-gate: no table under two games above the floor, or without data', () => {
    expect(difficultyTable(games, null)).toBeNull();
    expect(difficultyTable(games, { quizzes: sample(10, 20, 500) })).toBeNull();
    expect(difficultyTable(games, { quizzes: sample(30, 20, 500), 'blind-test': sample(1, 2, 500) })).toBeNull();
  });
});

describe('group grid and hub section', () => {
  const g = (slug: string, quizzes: number, plays: number): GridGroupInput => ({ slug, name: slug.toUpperCase(), quizzes, plays });

  it('groups with a hub and a second game, most games then most played, at most 24', () => {
    const groups = [g('bts', 30, 9000), g('twice', 10, 100), g('ive', 5, 5000), g('akmu', 3, 50), g('general-kpop', 40, 99999), g('riize', 0, 0), g('solo', 2, 1)];
    const has = { playlist: new Set(['bts', 'twice', 'ive', 'akmu', 'general-kpop', 'riize']), nameAll: new Set(['bts', 'ive']), wma: new Set(['bts']) };
    const grid = groupGrid(groups, has);
    expect(grid.map((x) => x.slug)).toEqual(['bts', 'ive', 'twice', 'akmu']);
    expect(grid[0]).toEqual({ slug: 'bts', name: 'BTS', href: `/bts-quiz#${GROUP_GAMES_ID}`, games: ['Quizzes', 'Blind test', 'Name them all', 'Which member'] });
    const many = Array.from({ length: 40 }, (_, i) => g(`g${i}`, 1, i));
    expect(groupGrid(many, { playlist: new Set(many.map((x) => x.slug)), nameAll: new Set(), wma: new Set() })).toHaveLength(GRID_SIZE);
    expect(groupGrid(groups.slice(0, GRID_MIN - 1), has)).toEqual([]);
  });

  it('a hub lists every game of its group, uncapped, from its own reads', () => {
    const w: WaysInput = {
      slug: 'stray-kids', name: 'Stray Kids', quizzes: 29, songs: 21,
      nameAll: { href: '/stray-kids-name-all-members', members: 8, perfectPct: null },
      whichMember: { href: '/which-stray-kids-member-are-you', results: null },
      thisOrThat: { votes: 1200 }, live: true,
    };
    const list = groupGames(w);
    expect(list.map((x) => x.key)).toEqual(['quizzes', 'blindtest', 'name-all', 'which-member', 'this-or-that', 'live']);
    expect(list[0]).toMatchObject({ href: '#hub-quizzes', title: 'Stray Kids quizzes', line: '29 published quizzes' });
    expect(list[2]).toMatchObject({ href: '/stray-kids-name-all-members', title: 'Name all 8 Stray Kids members' });
    expect(list[5]!.href).toBe('/live?playlist=stray-kids&name=Stray%20Kids');
    expect(groupGames({ ...w, quizzes: 0, songs: 0, nameAll: null, whichMember: null, thisOrThat: null })).toEqual([]);
    for (const x of list) expect(`${x.title} ${x.line}`).not.toMatch(DASHES);
  });
});

describe('TARGETS.md', () => {
  it('/kpop-games owns the "kpop games" cluster, one row, one URL', () => {
    const md = readFileSync(fileURLToPath(new URL('../../../../../docs/seo/TARGETS.md', import.meta.url)), 'utf8');
    const rows = md.split('\n').filter((l) => l.startsWith('| kpop games |'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('| /kpop-games |');
    expect(md.split('\n').filter((l) => l.includes('| /kpop-games |'))).toHaveLength(1);
  });
});
