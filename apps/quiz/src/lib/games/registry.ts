// The games of kpopquiz.org, in one place (SEO Mission 2, part A; rulebook
// .claude/skills/kpopquiz-seo/SKILL.md sections 1, 3, 4 and 8.3). /kpop-games, its title
// and description, its JSON-LD, the "{Group} games" section of every group hub and the
// tests all read this file, so a game is listed the same way everywhere.
//
// Pure: no database here. The page hands in what it read (lib/games/data.ts) as `facts`;
// every rule number below is imported from the game's own module, and every count is a
// real one rounded only by lib/stats/site-stats.ts (atLeast / exact). A game that is not
// live for this build (a flag off, the live mode closed, no group with a page) is not
// listed, so the count in the title is the count of games a visitor can open today.
//
// Retired features are never listed: games hub, rankings, tier lists, battle (REFONTE P1).

import { ROUND_SIZE } from '@/lib/blind-test-playlists';
import { LIVE_MAX_PLAYERS, LIVE_ROUND_OPTIONS } from '@/lib/live/constants';
import { LIVE_BASE_POINTS, LIVE_SPEED_POINTS } from '@/lib/live/scoring';
import { ROUND_SECONDS, prettyPath } from '@/lib/name-all/round';
import { WMA_QUESTION_COUNT } from '@/lib/personality/parse';
import { whichMemberPath } from '@/lib/personality/view';
import { BEST_RUNS, LEGEND_SLOTS, ROUND_COUNT as RANKED_ROUNDS, ROUND_MS as RANKED_ROUND_MS, SEASON_LENGTH_DAYS } from '@/lib/ranked/constants';
import { TIERS } from '@/lib/ranked/tiers';
import { fitTitle } from '@/lib/seo/title-fit';
import { atLeast, exact } from '@/lib/stats/site-stats';
import { CHALLENGE_TTL_MS } from '@/lib/ux-v1/p6/challenge';
import { ROUND_MS } from '@/lib/ux-v1/p6/points';
import { FANS_PICKED_ID, HUB_QUIZZES_ID, liveHref } from '@/lib/ux-v1/p3/growth';

import type { PublicStats } from '@/lib/stats/site-stats';
import type { WaysInput } from '@/lib/ux-v1/p3/growth';

export const SITE_URL = 'https://kpopquiz.org';
export const GAMES_PATH = '/kpop-games';
export const GAMES_H1 = 'K-pop games';

/** Songs of the Blindtest of the day: daily_blindtest_scores.score is CHECK (score BETWEEN
 *  0 AND 10) (migration 106) and ensure_daily_blindtest fills the day to 10 (migration 113). */
export const DAILY_SONGS = 10;

/** Clues of a "guess from clues" question (lib/db/types.ts: clues: [string, string, string]). */
export const CLUES_PER_QUESTION = 3;

const CLIP_SECONDS = ROUND_MS / 1000;

export type GameId =
  | 'blind-test'
  | 'daily-blind-test'
  | 'ranked-blind-test'
  | 'live-blind-test'
  | 'name-them-all'
  | 'which-member'
  | 'quizzes'
  | 'true-or-false'
  | 'guess-the-idol';

export type Players = 'Solo' | 'Group';

/** none: play without an account; board: play freely, the board needs an account;
 *  required: an account is needed to play. */
export type AccountRule = 'none' | 'board' | 'required';

export interface GroupRef { slug: string; name: string }
export interface GameLink { href: string; label: string }

export interface Game {
  id: GameId;
  name: string;
  /** What you do, one sentence (the table's second column). */
  what: string;
  duration: string;
  players: Players;
  /** Groups covered, for the table. */
  groups: string;
  /** Where the table links: the game's page, or its section on /kpop-games when the
   *  game has one page per group. */
  href: string;
  account: AccountRule;
  /** The H2 of the game's section, a question. */
  question: string;
  /** The answer, first sentence first (rulebook 3.2). */
  answer: string;
  links: GameLink[];
}

/** Published quizzes of one format (lib/games/data.ts readQuizAggregates). */
export interface QuizFormatFacts {
  quizzes: number;
  groups: number;
  /** Median question count of those quizzes, null when unknown. */
  medianQuestions: number | null;
}

export interface GamesFacts {
  /** NEXT_PUBLIC_UX_V1 (ranked exists only with it). */
  v1: boolean;
  /** isUxV12() (live, Name them all, Which member are you, This or that). */
  v12: boolean;
  /** isLiveOpen(): the live mode answers. */
  liveOpen: boolean;
  stats: PublicStats | null;
  /** Groups with a blind test playlist of their own, null when unknown. */
  playlistGroups: number | null;
  /** Groups with a Name them all page (named), A to Z. */
  nameAll: readonly GroupRef[];
  /** Groups with a Which member are you page (named), A to Z. */
  wma: readonly GroupRef[];
  /** Published quizzes by format, null when the read failed. */
  formats: { choice: QuizFormatFacts; trueFalse: QuizFormatFacts; clues: QuizFormatFacts } | null;
}

/** "5, 10 or 15". */
export function orList(items: readonly (string | number)[]): string {
  const s = items.map(String);
  if (s.length <= 1) return s.join('');
  return `${s.slice(0, -1).join(', ')} or ${s[s.length - 1]}`;
}

/** "a, b and c". */
export function andList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const groupsLabel = (n: number): string => `${atLeast(n)} ${n === 1 ? 'group' : 'groups'}`;
const questionsLabel = (f: QuizFormatFacts | undefined): string =>
  f?.medianQuestions ? `Typically ${f.medianQuestions} questions` : 'Set by each quiz';

/**
 * Every game a visitor can open on this build, in a stable order. `facts` decides which
 * exist: ranked needs the v11 flag, live needs the v12 flag and an open live mode, Name
 * them all and Which member are you need the v12 flag and at least one group with a page,
 * a quiz format needs at least one published quiz (an unknown count keeps it: its page
 * exists either way).
 */
export function buildGames(f: GamesFacts): Game[] {
  const s = f.stats;
  const out: Game[] = [];

  out.push({
    id: 'blind-test',
    name: 'K-pop blind test',
    what: `Hear a ${CLIP_SECONDS}-second clip and pick the song or the artist from four choices.`,
    duration: `${ROUND_SIZE} songs, ${CLIP_SECONDS} seconds each`,
    players: 'Solo',
    groups: s ? groupsLabel(s.songGroups) : 'Every generation',
    href: '/blindtest',
    account: 'none',
    question: 'What is a K-pop blind test?',
    answer:
      `A K-pop blind test plays a short clip of a song and you name the song or the artist. On kpopquiz.org a round is ${ROUND_SIZE} songs with a ${CLIP_SECONDS}-second clip each and four choices, and a fast right answer scores more points.`
      + (s
        ? ` The catalog holds ${atLeast(s.songs)} songs from ${groupsLabel(s.songGroups)}${f.playlistGroups ? `, and ${groupsLabel(f.playlistGroups)} have a playlist of their own` : ''}.`
        : ''),
    links: [
      { href: '/blindtest', label: 'Play the K-pop blind test' },
      ...(f.v12 ? [{ href: '/guess-the-kpop-song', label: 'Guess the K-pop song' }] : []),
    ],
  });

  out.push({
    id: 'daily-blind-test',
    name: 'Blindtest of the day',
    what: `The same ${DAILY_SONGS} songs for every player, one try a day, then your rank on today's board.`,
    duration: `${DAILY_SONGS} songs, once a day`,
    players: 'Solo',
    groups: 'The whole blind test catalog',
    href: '/blindtest?daily=true',
    account: 'board',
    question: 'What is the Blindtest of the day?',
    answer: `The Blindtest of the day is one round of ${DAILY_SONGS} songs, the same for every player, and you get one try a day. Signed-in players get a rank on today's board, which resets at midnight UTC.`,
    links: [
      { href: '/blindtest?daily=true', label: 'Play the Blindtest of the day' },
      { href: '/blindtest/leaderboard', label: "Today's board" },
    ],
  });

  if (f.v1) {
    const first = TIERS[0]!.name;
    const last = TIERS[TIERS.length - 1]!.name;
    out.push({
      id: 'ranked-blind-test',
      name: 'Ranked blindtest',
      what: `${RANKED_ROUNDS} songs drawn by the server, the same rules for everyone, and a season ladder from ${first} to ${last}.`,
      duration: `${RANKED_ROUNDS} songs, ${RANKED_ROUND_MS / 1000} seconds each`,
      players: 'Solo',
      groups: 'One song pool for everyone',
      href: '/blindtest/ranked',
      account: 'required',
      question: 'How does the ranked blindtest work?',
      answer: `Ranked is a blindtest played for a season score. The server draws ${RANKED_ROUNDS} songs, everyone plays by the same rules, and your ${BEST_RUNS} best runs make your season score. A season lasts ${SEASON_LENGTH_DAYS} days, the tiers go from ${first} to ${last}, and the top ${LEGEND_SLOTS} ${last} players are Legends. You need a free account to play ranked.`,
      links: [{ href: '/blindtest/ranked', label: 'Play ranked' }],
    });
  }

  if (f.v12 && f.liveOpen) {
    out.push({
      id: 'live-blind-test',
      name: 'Live blindtest',
      what: 'One screen plays the clips and everyone answers on their phone. The fastest right answer wins.',
      duration: `${orList(LIVE_ROUND_OPTIONS)} rounds`,
      players: 'Group',
      groups: 'All K-pop, a mix or a generation',
      href: '/live',
      account: 'none',
      question: 'How do you play a live K-pop blindtest?',
      answer: `One screen hosts the game and plays the clips, and everyone answers on their phone at kpopquiz.org/join with the room code or the QR code. Up to ${LIVE_MAX_PLAYERS} phones can join a room, nobody needs an account, and a fast right answer wins up to ${exact(LIVE_BASE_POINTS + LIVE_SPEED_POINTS)} points a round.`,
      links: [
        { href: '/live', label: 'Host a live blindtest' },
        { href: '/join', label: 'Join with a code' },
      ],
    });
  }

  if (f.v12 && f.nameAll.length > 0) {
    out.push({
      id: 'name-them-all',
      name: 'Name them all',
      what: `Type the name of every member of a group before the ${ROUND_SECONDS}-second timer runs out.`,
      duration: `${ROUND_SECONDS} seconds`,
      players: 'Solo',
      groups: groupsLabel(f.nameAll.length),
      href: '#name-them-all',
      account: 'none',
      question: 'What is Name them all?',
      answer: `Name them all gives you ${ROUND_SECONDS} seconds to type the name of every member of a K-pop group. Stage names, real names and Hangul all count. It is open for ${groupsLabel(f.nameAll.length)}:`,
      links: f.nameAll.map((g) => ({ href: prettyPath(g.slug), label: g.name })),
    });
  }

  if (f.v12 && f.wma.length > 0) {
    out.push({
      id: 'which-member',
      name: 'Which member are you?',
      what: `Answer ${WMA_QUESTION_COUNT} questions about yourself and see which member of a group you are most like.`,
      duration: `${WMA_QUESTION_COUNT} questions, no timer`,
      players: 'Solo',
      groups: groupsLabel(f.wma.length),
      href: '#which-member',
      account: 'none',
      question: 'What is the Which member are you? quiz?',
      answer: `Which member are you? asks ${WMA_QUESTION_COUNT} questions about you, with no right answers and no timer, then shows the member of the group whose profile is closest to your answers. It is open for ${groupsLabel(f.wma.length)}:`,
      links: f.wma.map((g) => ({ href: whichMemberPath(g.slug), label: g.name })),
    });
  }

  out.push({
    id: 'quizzes',
    name: 'K-pop trivia quizzes',
    what: 'Answer questions about a group: multiple choice, a picture to recognise or an odd one out to spot.',
    duration: questionsLabel(f.formats?.choice),
    players: 'Solo',
    groups: s ? groupsLabel(s.groupsWithQuizzes) : 'Dozens of groups',
    href: '/quizzes',
    account: 'none',
    question: 'What K-pop quizzes can you play?',
    answer:
      (s
        ? `kpopquiz.org has ${atLeast(s.quizzes)} published K-pop quizzes about ${groupsLabel(s.groupsWithQuizzes)}, most of them written by fans.`
        : 'kpopquiz.org has hundreds of published K-pop quizzes, most of them written by fans.')
      + ' Most are multiple choice; others show a picture or ask you to spot the odd one out. You can pick one by group, by difficulty or by date.',
    links: [
      { href: '/quizzes', label: 'All K-pop quizzes' },
      { href: '/easy-kpop-quizzes', label: 'Easy K-pop quizzes' },
      { href: '/hard-kpop-quizzes', label: 'Hard K-pop quizzes' },
      { href: '/new', label: 'New K-pop quizzes' },
      { href: '/groups', label: 'K-pop groups A to Z' },
    ],
  });

  const tf = f.formats?.trueFalse;
  if (!tf || tf.quizzes > 0) {
    out.push({
      id: 'true-or-false',
      name: 'K-pop true or false',
      what: 'Read a statement about K-pop and decide if it is true or false.',
      duration: questionsLabel(tf),
      players: 'Solo',
      groups: tf ? groupsLabel(tf.groups) : 'Many groups',
      href: '/kpop-true-or-false',
      account: 'none',
      question: 'How do K-pop true or false quizzes work?',
      answer: 'Each question is a statement about K-pop, and you pick true or false.'
        + (tf ? ` ${atLeast(tf.quizzes)} true or false ${tf.quizzes === 1 ? 'quiz is' : 'quizzes are'} published, about ${groupsLabel(tf.groups)}.` : ''),
      links: [{ href: '/kpop-true-or-false', label: 'K-pop true or false quizzes' }],
    });
  }

  const clues = f.formats?.clues;
  if (!clues || clues.quizzes > 0) {
    out.push({
      id: 'guess-the-idol',
      name: 'Guess the K-pop idol',
      what: `Guess the idol or the song from up to ${CLUES_PER_QUESTION} clues. The fewer clues you need, the more points you score.`,
      duration: `${CLUES_PER_QUESTION} clues per question`,
      players: 'Solo',
      groups: clues ? groupsLabel(clues.groups) : 'Many groups',
      href: '/guess-the-kpop-idol',
      account: 'none',
      question: 'How does Guess the K-pop idol work?',
      answer: `Each question gives you up to ${CLUES_PER_QUESTION} clues about an idol or a song, one at a time, and the fewer clues you need, the more points you score.`
        + (clues ? ` ${atLeast(clues.quizzes)} clue ${clues.quizzes === 1 ? 'quiz is' : 'quizzes are'} published, about ${groupsLabel(clues.groups)}.` : ''),
      links: [{ href: '/guess-the-kpop-idol', label: 'Guess the K-pop idol quizzes' }],
    });
  }

  return out;
}

/** The absolute URL of a game for the ItemList (a section anchor stays on this page). */
export function gameUrl(g: Game): string {
  return g.href.startsWith('#') ? `${SITE_URL}${GAMES_PATH}${g.href}` : `${SITE_URL}${g.href}`;
}

// ---------------------------------------------------------------------------------------
// Title, description, answer block (rulebook 2 and 3.1)
// ---------------------------------------------------------------------------------------

/** "K-pop Games: 9 Free Games to Play Online": 60 characters or fewer with " | KpopQuiz". */
export function gamesTitle(n: number): string {
  return fitTitle(`K-pop Games: ${n} Free Games to Play Online`, `K-pop Games: ${n} Free Games`, 'K-pop Games');
}

export const DESCRIPTION_MIN = 150;
export const DESCRIPTION_MAX = 160;

/** What the description and the answer block say about the games that exist. */
function highlights(games: readonly Game[], stats: PublicStats | null): { has: (id: GameId) => boolean; quizzes: string } {
  const ids = new Set(games.map((g) => g.id));
  return { has: (id) => ids.has(id), quizzes: stats ? `${atLeast(stats.quizzes)} fan-made quizzes` : 'fan-made quizzes' };
}

/**
 * The meta description, 150 to 160 characters: the first wording in range wins, else the
 * one closest to 155. The primary phrase "K-pop games" appears once.
 */
export function gamesDescription(games: readonly Game[], stats: PublicStats | null): string {
  const h = highlights(games, stats);
  const parts = [`a blind test with ${CLIP_SECONDS}-second clips`];
  if (h.has('name-them-all')) parts.push('Name them all');
  if (h.has('live-blind-test')) parts.push('live games with friends');
  parts.push(h.quizzes);
  const head = `Play ${games.length} free K-pop games online: ${andList(parts)}.`;
  const tails = [' No download, no fee.', ' Play on a phone or a computer.', ' Most need no account.', ' Free, in your browser.'];
  const candidates: string[] = [head];
  for (let mask = 1; mask < 1 << tails.length; mask += 1) {
    candidates.push(head + tails.filter((_, i) => mask & (1 << i)).join(''));
  }
  const inRange = candidates.find((c) => c.length >= DESCRIPTION_MIN && c.length <= DESCRIPTION_MAX);
  if (inRange) return inRange;
  return candidates.reduce((best, c) => (Math.abs(c.length - 155) < Math.abs(best.length - 155) ? c : best), head);
}

export const ANSWER_MIN_WORDS = 40;
export const ANSWER_MAX_WORDS = 60;

export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** "October 2026", in UTC (the date of the counts). */
export function monthLabel(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The answer block (40 to 60 words, server HTML): what the page is, the number of games
 * and the month, then what the main games are. Understandable when quoted alone.
 */
export function gamesAnswer(games: readonly Game[], stats: PublicStats | null, month: string): string {
  const h = highlights(games, stats);
  const s1 = `kpopquiz.org has ${games.length} free K-pop games to play online in ${month}, on a phone or a computer.`;
  const s2 = stats
    ? `The blind test plays a ${CLIP_SECONDS}-second clip from ${atLeast(stats.songs)} songs and you name the song.`
    : `The blind test plays a ${CLIP_SECONDS}-second clip and you name the song.`;
  const also: string[] = [];
  if (h.has('name-them-all')) also.push(`name every member of a group in ${ROUND_SECONDS} seconds`);
  if (h.has('live-blind-test')) also.push('play live with friends');
  also.push(stats ? `take one of ${h.quizzes}` : 'take a fan-made quiz');
  const s3 = `You can also ${orList(also)}.`;
  const tails = ['Most games need no account.', 'Every game is free.'];
  const candidates = [
    [s1, s2, s3, ...tails].join(' '),
    [s1, s2, s3, tails[0]].join(' '),
    [s1, s2, s3].join(' '),
  ];
  return candidates.find((c) => wordCount(c) >= ANSWER_MIN_WORDS && wordCount(c) <= ANSWER_MAX_WORDS) ?? candidates[candidates.length - 1]!;
}

// ---------------------------------------------------------------------------------------
// Friends and FAQ (built from the games that exist, so they never promise a missing one)
// ---------------------------------------------------------------------------------------

export interface FriendsBlock {
  answer: string;
  items: Array<{ title: string; body: string; link: GameLink | null }>;
}

export function friendsBlock(games: readonly Game[], v12: boolean): FriendsBlock {
  const live = games.some((g) => g.id === 'live-blind-test');
  const hours = Math.round(CHALLENGE_TTL_MS / 3_600_000);
  const items: FriendsBlock['items'] = [];
  if (live) {
    items.push({
      title: 'Live blindtest',
      body: `Put the host screen on a TV, a laptop or a stream. Friends join on their phones with a code, up to ${LIVE_MAX_PLAYERS} players, and a podium closes the game. It works for a party, a class or a stream.`,
      link: { href: '/live', label: 'Host a live blindtest' },
    });
  }
  items.push({
    title: 'Challenge a friend',
    body: `After a blind test run you get a link with your exact ${ROUND_SIZE} songs. Your friend plays the same round and you compare scores. The link works for ${hours} hours.`,
    link: { href: '/blindtest', label: 'Start a blind test run' },
  });
  if (v12) {
    items.push({
      title: 'This or that',
      body: 'After a quiz result, This or that shows two songs of the group: pick one and see how other fans voted. It is not a page of its own: it comes with the quizzes, and once a group has enough votes its page shows the songs fans pick most.',
      link: null,
    });
  }
  const answer = live
    ? `The live blindtest is the K-pop game made for a group: one screen plays the clips and everyone answers on their own phone, with no account. To play with a friend who is not in the room, send a blind test challenge link.`
    : `To play with a friend, send a blind test challenge link: your friend plays your exact ${ROUND_SIZE} songs and you compare scores.`;
  return { answer, items };
}

export interface FaqItem { q: string; a: string }

export function gamesFaq(games: readonly Game[]): FaqItem[] {
  const by = (id: GameId): Game | undefined => games.find((g) => g.id === id);
  const required = games.filter((g) => g.account === 'required').map((g) => g.name);
  const board = games.filter((g) => g.account === 'board').map((g) => g.name);
  const live = by('live-blind-test');
  let account = 'No, most games need no account.';
  if (required.length) account += ` You need a free account to play ${andList(required)}.`;
  if (board.length) account += ` Anyone can play the ${andList(board)}, but only signed-in players get a place on its board.`;
  if (live) account += ' Live blindtest players join with a nickname.';
  const friends = live
    ? 'Yes. Host a live blindtest on a big screen and let your friends answer on their phones, or send a blind test challenge link so a friend plays your exact songs.'
    : 'Yes. Send a blind test challenge link so a friend plays your exact songs, then compare your scores.';
  return [
    { q: 'Are the K-pop games free?', a: 'Yes. Every game on this page is free to play, with nothing to download: they run in your browser.' },
    { q: 'Do I need an account?', a: account },
    {
      q: 'Can I play on my phone?',
      a: live
        ? 'Yes. Every game works in a phone browser, with no app to install. In the live blindtest, the phone is the controller.'
        : 'Yes. Every game works in a phone browser, with no app to install.',
    },
    { q: 'Can I play K-pop games with friends?', a: friends },
  ];
}

// ---------------------------------------------------------------------------------------
// "Which K-pop game is the hardest?" (rulebook 4.3: averages with their denominator)
// ---------------------------------------------------------------------------------------

/** A game ranks by difficulty only from this many attempts (rulebook 4.3 floors: 50 to rank a
 *  quiz, 100 for a distribution; a game-to-game comparison uses the stricter one). */
export const DIFFICULTY_MIN_ATTEMPTS = 100;
/** The section shows only when at least this many games pass the floor. */
export const DIFFICULTY_MIN_ROWS = 2;

/** Right answers out of answers asked, over `attempts` attempts, the first one on `since`. */
export interface ScoreSample { right: number; asked: number; attempts: number; since: string | null }

export type ScoredGameId = Extract<GameId, 'blind-test' | 'daily-blind-test' | 'ranked-blind-test' | 'live-blind-test' | 'name-them-all' | 'quizzes' | 'true-or-false'>;
export type DifficultyFacts = Partial<Record<ScoredGameId, ScoreSample | null>>;

/** `measure`: what the percent counts; `got`: the verb phrase of the answer sentence. */
const UNITS: Record<ScoredGameId, { one: string; many: string; measure: string; got: (pct: number) => string }> = {
  'blind-test': { one: 'finished run', many: 'finished runs', measure: 'songs', got: (p) => `get ${p}% of the songs right` },
  'daily-blind-test': { one: 'daily score', many: 'daily scores', measure: 'songs', got: (p) => `get ${p}% of the songs right` },
  'ranked-blind-test': { one: 'finished run', many: 'finished runs', measure: 'songs', got: (p) => `get ${p}% of the songs right` },
  'live-blind-test': { one: 'player', many: 'players', measure: 'answers', got: (p) => `get ${p}% of their answers right` },
  'name-them-all': { one: 'round', many: 'rounds', measure: 'members', got: (p) => `name ${p}% of the members` },
  quizzes: { one: 'play', many: 'plays', measure: 'answers', got: (p) => `get ${p}% of the answers right` },
  'true-or-false': { one: 'play', many: 'plays', measure: 'answers', got: (p) => `get ${p}% of the answers right` },
};

export interface DifficultyRow {
  id: ScoredGameId;
  name: string;
  href: string;
  /** Rounded percent of right answers. */
  pct: number;
  /** "songs", "answers", "members": what the percent counts. */
  measure: string;
  /** "get 54% of the songs right", "name 87% of the members". */
  got: string;
  attempts: number;
  /** "107 daily scores". */
  basedOn: string;
  /** "July 2026", or null. */
  since: string | null;
}

export interface DifficultyTable {
  /** Hardest first (lowest share of right answers). */
  rows: DifficultyRow[];
  /** Scored games below the floor (names), shown as "Not enough data yet". */
  thin: string[];
  /** Listed games that are not compared, each with its reason ("Which member are you? has
   *  no right answers"). */
  unscored: string[];
}

/** Why a listed game has no row in the difficulty table. */
const NOT_COMPARED: Partial<Record<GameId, string>> = {
  'which-member': 'has no right answers',
  'guess-the-idol': 'scores points per clue, not right answers',
};

/** The table, or null when fewer than DIFFICULTY_MIN_ROWS games pass the floor (min-gate). */
export function difficultyTable(games: readonly Game[], facts: DifficultyFacts | null): DifficultyTable | null {
  if (!facts) return null;
  const rows: DifficultyRow[] = [];
  const thin: string[] = [];
  const unscored: string[] = [];
  for (const g of games) {
    if (!(g.id in UNITS)) {
      unscored.push(`${g.name} ${NOT_COMPARED[g.id] ?? 'has no score to compare'}`);
      continue;
    }
    const id = g.id as ScoredGameId;
    const sample = facts[id];
    if (!sample || sample.attempts < DIFFICULTY_MIN_ATTEMPTS || sample.asked <= 0 || sample.right < 0 || sample.right > sample.asked) {
      thin.push(g.name);
      continue;
    }
    const u = UNITS[id];
    rows.push({
      id,
      name: g.name,
      href: g.href,
      pct: Math.round((100 * sample.right) / sample.asked),
      measure: u.measure,
      got: u.got(Math.round((100 * sample.right) / sample.asked)),
      attempts: sample.attempts,
      basedOn: `${exact(sample.attempts)} ${sample.attempts === 1 ? u.one : u.many}`,
      since: sample.since ? monthLabel(sample.since) : null,
    });
  }
  rows.sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name, 'en'));
  if (rows.length < DIFFICULTY_MIN_ROWS) return null;
  return { rows, thin, unscored };
}

/** The first sentence of the section: the hardest game, its average and its denominator. */
export function difficultyAnswer(t: DifficultyTable): string {
  const h = t.rows[0]!;
  const e = t.rows[t.rows.length - 1]!;
  const since = h.since ? ` since ${h.since}` : '';
  return `Of the K-pop games with enough plays to compare, ${h.name} is the hardest so far: players ${h.got}, over ${h.basedOn}${since}. ${e.name} is the easiest: players ${e.got}.`;
}

// ---------------------------------------------------------------------------------------
// "K-pop games by group": the grid of /kpop-games and the "{Group} games" hub section
// ---------------------------------------------------------------------------------------

/** Anchor of the "{Group} games" section on every group hub (/<slug>-quiz#games). */
export const GROUP_GAMES_ID = 'games';
export const GRID_SIZE = 24;
/** Under this many groups the grid is not shown (min-gate). */
export const GRID_MIN = 4;

export interface GridGroupInput {
  slug: string;
  name: string;
  /** Published quizzes of the group. */
  quizzes: number;
  /** Plays of those quizzes (their total_completions), the tie-break. */
  plays: number;
}

export interface GridGroup {
  slug: string;
  name: string;
  href: string;
  games: string[];
}

/**
 * Up to GRID_SIZE groups for the grid: groups with a hub (a published quiz) and at least one
 * more game (a blind test playlist, Name them all, Which member are you), most games first,
 * then most played. The General K-pop category is not a group.
 */
export function groupGrid(
  groups: readonly GridGroupInput[],
  has: { playlist: ReadonlySet<string> | null; nameAll: ReadonlySet<string>; wma: ReadonlySet<string> },
): GridGroup[] {
  const ranked = groups
    .filter((g) => g.quizzes > 0 && g.slug !== 'general-kpop')
    .map((g) => {
      const games = ['Quizzes'];
      if (has.playlist?.has(g.slug)) games.push('Blind test');
      if (has.nameAll.has(g.slug)) games.push('Name them all');
      if (has.wma.has(g.slug)) games.push('Which member');
      return { g, games };
    })
    .filter((x) => x.games.length >= 2)
    .sort((a, b) => b.games.length - a.games.length || b.g.plays - a.g.plays || a.g.name.localeCompare(b.g.name, 'en'))
    .slice(0, GRID_SIZE)
    .map(({ g, games }) => ({ slug: g.slug, name: g.name, href: `/${g.slug}-quiz#${GROUP_GAMES_ID}`, games }));
  return ranked.length >= GRID_MIN ? ranked : [];
}

export interface GroupGame { key: string; href: string; title: string; line: string }

/** The "{Group} games" heading of a hub. */
export const groupGamesTitle = (name: string): string => `${name} games`;

/**
 * Every game of one group, for its hub, from the hub's own reads (lib/ux-v1/p3/growth-data.ts
 * WaysInput): no cap, unlike the four "Ways to play" tiles. The section shows with two or more.
 */
export function groupGames(w: WaysInput): GroupGame[] {
  const out: GroupGame[] = [];
  if (w.quizzes > 0) {
    out.push({ key: 'quizzes', href: `#${HUB_QUIZZES_ID}`, title: `${w.name} quizzes`, line: `${exact(w.quizzes)} published ${w.quizzes === 1 ? 'quiz' : 'quizzes'}` });
  }
  if (w.songs > 0) {
    out.push({ key: 'blindtest', href: `/blindtest/group-${w.slug}`, title: `${w.name} blind test`, line: `${exact(w.songs)} ${w.songs === 1 ? 'song' : 'songs'}, ${CLIP_SECONDS}-second clips` });
  }
  if (w.nameAll && w.nameAll.members >= 2) {
    out.push({ key: 'name-all', href: w.nameAll.href, title: `Name all ${w.nameAll.members} ${w.name} members`, line: `${ROUND_SECONDS} seconds on the clock` });
  }
  if (w.whichMember) {
    out.push({ key: 'which-member', href: w.whichMember.href, title: `Which ${w.name} member are you?`, line: `${WMA_QUESTION_COUNT} questions about you` });
  }
  if (w.thisOrThat) {
    out.push({ key: 'this-or-that', href: `#${FANS_PICKED_ID}`, title: 'This or that', line: `Two ${w.name} songs, pick one` });
  }
  if (w.live && w.songs > 0) {
    out.push({ key: 'live', href: liveHref(w.slug, w.name), title: `Live ${w.name} blindtest`, line: 'Host on a big screen, friends answer on their phones' });
  }
  return out;
}

/** The first sentence of the hub section. */
export function groupGamesAnswer(name: string, games: readonly GroupGame[]): string {
  return `${name} fans can play ${games.length} games on kpopquiz.org, all free.`;
}
